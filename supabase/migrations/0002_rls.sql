-- ═══════════════════════════════════════════════════════════════════
-- Plan de Partido · Row Level Security
-- Regla: lectura = cualquier usuario con sesión · escritura = solo admin
-- El rol anon (sin sesión) no tiene acceso a nada.
-- ═══════════════════════════════════════════════════════════════════

-- ¿El usuario actual es admin?  (security definer para no depender del RLS de profiles)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ─── Tablas de datos: teams, players, matches, match_events ────────
do $$
declare t text;
begin
  foreach t in array array['teams', 'players', 'matches', 'match_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);

    execute format('drop policy if exists "%s_select_authenticated" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_admin" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_admin" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_admin" on public.%I', t, t);

    execute format(
      'create policy "%s_select_authenticated" on public.%I
         for select to authenticated using (true)', t, t);
    execute format(
      'create policy "%s_insert_admin" on public.%I
         for insert to authenticated with check (public.is_admin())', t, t);
    execute format(
      'create policy "%s_update_admin" on public.%I
         for update to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
    execute format(
      'create policy "%s_delete_admin" on public.%I
         for delete to authenticated using (public.is_admin())', t, t);
  end loop;
end;
$$;

-- ─── profiles ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Solo un admin modifica perfiles (no hay política de UPDATE para viewers).
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- No hay política de INSERT: los perfiles solo los crea el trigger handle_new_user.

-- Defensa extra: impedir cambios de rol hechos por no-admins
-- (auth.uid() es null en el SQL editor / service_role → se permite, así se nombra al primer admin).
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'No autorizado a cambiar el rol';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_escalation on public.profiles;
create trigger prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();
