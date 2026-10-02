-- No hay registro público (spec §0): solo el admin crea usuarios, por invitación.
-- Defensa en la base, por si "Allow new users to sign up" queda habilitado en Auth:
-- una invitación (inviteUserByEmail) setea auth.users.invited_at; un signUp público no.
-- Sin esto, cualquiera con la anon key podría registrarse con rol=admin en los metadatos.

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.invited_at is null then
    raise exception 'El registro público está deshabilitado';
  end if;
  insert into profiles (id, rol, nombre, apellido, email, telefono)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'rol')::rol_usuario, 'alumno'),
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    new.email,
    new.raw_user_meta_data->>'telefono'
  );
  return new;
end $$;
