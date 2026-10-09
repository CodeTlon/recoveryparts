-- Buckets de Storage.
-- `materiales`: PRIVADO (PDFs del campus, solo URLs firmadas de corta duración).
-- `sitio`: público (imágenes del CMS: hero, galería, egresados, cursos).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materiales', 'materiales', false, 26214400, array['application/pdf'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sitio', 'sitio', true, 8388608, array['image/webp','image/jpeg','image/png','image/avif'])
on conflict (id) do nothing;

-- Ruta de los PDFs: materiales/{curso_id}/{uuid}.pdf
create policy materiales_staff_write on storage.objects for insert to authenticated
  with check (bucket_id = 'materiales'
    and (es_admin() or es_profesor_de(((storage.foldername(name))[1])::uuid)));
create policy materiales_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'materiales'
    and (es_admin() or es_profesor_de(((storage.foldername(name))[1])::uuid)));
create policy materiales_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'materiales'
    and (es_admin() or es_profesor_de(((storage.foldername(name))[1])::uuid)));
-- Lectura: staff del curso. El alumno NO lee de Storage directo: el servidor
-- valida material_visible() y firma una URL temporal (RF-34).
create policy materiales_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'materiales'
    and (es_admin() or es_profesor_de(((storage.foldername(name))[1])::uuid)));

create policy sitio_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'sitio' and es_admin()) with check (bucket_id = 'sitio' and es_admin());
