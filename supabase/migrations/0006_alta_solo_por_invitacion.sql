-- El perfil (y su rol) se crea ÚNICAMENTE para usuarios invitados por el servidor.
-- Corrige dos problemas del trigger anterior:
--  1) GoTrue crea el usuario y recién DESPUÉS marca invited_at, así que una invitación de
--     profesor/administrador terminaba como 'alumno' (el INSERT veía invited_at nulo).
--  2) Un registro público (signUp) obtenía un perfil de alumno.
-- Ahora: sin invited_at no hay perfil ni acceso; al marcarse invited_at se crea con el rol de los metadatos.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta_rol  text := new.raw_user_meta_data->>'rol';
  rol_final rol_usuario := 'alumno';
begin
  if new.invited_at is null then
    return new; -- registro público: sin perfil
  end if;
  if meta_rol in ('alumno', 'profesor', 'administrador') then
    rol_final := meta_rol::rol_usuario;
  end if;

  insert into public.profiles (id, email, nombre, apellido, telefono, rol)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    nullif(new.raw_user_meta_data->>'telefono', ''),
    rol_final
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_invited on auth.users;
create trigger on_auth_user_invited after update of invited_at on auth.users
  for each row when (old.invited_at is null and new.invited_at is not null)
  execute function public.handle_new_user();
