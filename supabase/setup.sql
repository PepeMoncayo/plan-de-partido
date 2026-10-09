-- Plan de Partido · instalación completa (0001 + 0002 + 0003)
-- Pega TODO este archivo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces sin romper nada.

-- ════════ supabase/migrations/0001_schema.sql ════════
-- ═══════════════════════════════════════════════════════════════════
-- Plan de Partido · Esquema
-- Ejecutar en orden: 0001_schema → 0002_rls → 0003_storage (→ seed opcional)
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── profiles ──────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  nombre      text,
  role        text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── teams ─────────────────────────────────────────────────────────
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  shield_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── players ───────────────────────────────────────────────────────
create table if not exists public.players (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  position     text not null check (position in ('POR', 'DEF', 'CEN', 'DEL')),
  dorsal       integer check (dorsal between 1 and 99),
  age          integer check (age between 10 and 60),
  birth_date   date,
  height       integer check (height between 100 and 250),   -- cm
  weight       integer check (weight between 30 and 200),    -- kg
  fitness      integer not null default 80 check (fitness between 0 and 100),
  photo_url    text,
  team_id      uuid references public.teams(id) on delete set null,
  video_url    text,
  descripcion  text,
  -- { paseCorto, regate, control, visionJuego, disparo }  0–100
  con_balon    jsonb not null default '{}'::jsonb,
  -- { presion, anticipacion, marcaje, posicionamiento, recuperacion }  0–100
  sin_balon    jsonb not null default '{}'::jsonb,
  -- { velocidad, resistencia, fuerza, salto, agilidad }  0–100
  condicional  jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── matches ───────────────────────────────────────────────────────
create table if not exists public.matches (
  id               uuid primary key default gen_random_uuid(),
  home_team_id     uuid references public.teams(id) on delete set null,
  away_team_id     uuid references public.teams(id) on delete set null,
  home_team        text not null,
  away_team        text not null,
  home_shield_url  text,
  away_shield_url  text,
  opponent         text,
  date             date,
  competition      text not null default 'Amistoso',
  venue            text,
  status           text not null default 'Planificado'
                   check (status in ('Planificado', 'Jugado', 'Aplazado')),
  score            text,
  -- { name, style, tendencies: [] }
  referee          jsonb not null default '{}'::jsonb,

  -- Informe rival
  rival_buttons    jsonb not null default '{}'::jsonb,   -- { grupo: opción }
  rival_notes      text,
  rival_slide_url  text,
  rival_video_url  text,
  rival_extra_url  text,

  -- Alineación
  formation        text not null default '4-3-3',
  rival_formation  text,
  lineup           jsonb not null default '{}'::jsonb,   -- { spotId: playerId }

  -- Plan de partido: { ataque|defensa|transiciones: { notes, video, img1, img2, doc } }
  phases           jsonb not null default '{}'::jsonb,

  -- ABP: { ofensivo: { corners: [4], faltasLaterales: [2] },
  --        defensivo: { corner, faltaLateral, faltaFrontal } }
  -- cada tarjeta: { img1, img1Notes, img1VideoUrl, img2, img2Notes, img2VideoUrl }
  abp_data         jsonb not null default '{}'::jsonb,

  -- Vídeo y eventos
  video_url        text,
  half_times       jsonb not null default '{}'::jsonb,   -- { start1, end1, start2, end2 } en "m:ss"

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── match_events ──────────────────────────────────────────────────
create table if not exists public.match_events (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references public.matches(id) on delete cascade,
  type         text not null check (type in ('gol', 'ocasion', 'duelo', 'nota')),
  minute       integer,
  video_time   numeric,              -- segundos en el vídeo
  note         text,
  player_id    uuid references public.players(id) on delete set null,
  player_name  text,
  field_x      numeric check (field_x between 0 and 100),
  field_y      numeric check (field_y between 0 and 100),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists match_events_match_id_idx on public.match_events (match_id);
create index if not exists players_position_idx on public.players (position);
create index if not exists matches_date_idx on public.matches (date);

-- Triggers updated_at
do $$
declare t text;
begin
  foreach t in array array['profiles', 'teams', 'players', 'matches', 'match_events'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ─── Alta de usuario → perfil SIEMPRE como viewer ──────────────────
-- Para nombrar admin: ver README (UPDATE manual en el SQL editor).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuarios creados antes de instalar el trigger → perfil viewer
insert into public.profiles (id, email, nombre, role)
select id, email, split_part(email, '@', 1), 'viewer'
from auth.users
where email is not null
on conflict (id) do nothing;

-- ════════ supabase/migrations/0002_rls.sql ════════
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

-- ════════ supabase/migrations/0003_storage.sql ════════
-- ═══════════════════════════════════════════════════════════════════
-- Plan de Partido · Storage
-- Bucket privado "media": fotos de jugadores, escudos e imágenes de plan/ABP.
-- Lectura con sesión (la app usa URLs firmadas) · escritura solo admin.
-- ═══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  5242880,  -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media_select_authenticated" on storage.objects;
drop policy if exists "media_insert_admin" on storage.objects;
drop policy if exists "media_update_admin" on storage.objects;
drop policy if exists "media_delete_admin" on storage.objects;

create policy "media_select_authenticated" on storage.objects
  for select to authenticated
  using (bucket_id = 'media');

create policy "media_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

create policy "media_update_admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

create policy "media_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
