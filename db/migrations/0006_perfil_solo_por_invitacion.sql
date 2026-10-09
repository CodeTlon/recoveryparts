-- Corrige 0005. GoTrue crea el usuario y DESPUÉS marca invited_at, así que rechazar
-- en el INSERT también bloqueaba las invitaciones legítimas del admin.
-- Diseño: el perfil (y su rol) se crea únicamente cuando el usuario fue INVITADO
-- (invited_at no nulo, algo que solo puede hacer el servidor con service_role).
-- Un signUp público queda sin perfil: no pasa el middleware ni ninguna política RLS.

create or replace function crear_perfil_invitado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.invited_at is null then
    return new; -- registro público: sin perfil, sin acceso
  end if;
  insert into profiles (id, rol, nombre, apellido, email, telefono)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'rol')::rol_usuario, 'alumno'),
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    new.email,
    new.raw_user_meta_data->>'telefono'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function crear_perfil_invitado();

drop trigger if exists on_auth_user_invited on auth.users;
create trigger on_auth_user_invited after update of invited_at on auth.users
  for each row when (old.invited_at is null and new.invited_at is not null)
  execute function crear_perfil_invitado();

drop function if exists handle_new_user();
