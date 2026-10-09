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
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
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
