-- PDFs reales en un bucket PRIVADO (además de los links externos que ya existían).
-- El alumno nunca lee Storage directo: la app sirve el archivo tras validar el acceso
-- con las mismas políticas RLS de `materiales` (liberado + matrícula activa).

alter table materiales add column if not exists storage_path text;
alter table materiales alter column url drop not null;
alter table materiales add constraint materiales_origen
  check ((tipo = 'link' and url is not null) or (tipo = 'pdf' and (url is not null or storage_path is not null)));

create or replace function public.es_profesor_del_curso(p_curso bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cursos c where c.id = p_curso and c.profesor_id = auth.uid() and current_user_rol() = 'profesor')
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materiales', 'materiales', false, 26214400, array['application/pdf'])
on conflict (id) do nothing;

-- Ruta de los archivos: materiales/{curso_id}/{uuid}.pdf
create policy "materiales storage staff" on storage.objects for all to authenticated
  using (bucket_id = 'materiales' and (is_admin() or es_profesor_del_curso(((storage.foldername(name))[1])::bigint)))
  with check (bucket_id = 'materiales' and (is_admin() or es_profesor_del_curso(((storage.foldername(name))[1])::bigint)));
