-- 0023 · Validaciones que solo estaban en el formulario.

-- 1. El profesor de una edición tiene que ser un profesor. Antes cualquier UUID pasaba; con el de un alumno,
--    `ediciones_publicas` habría mostrado su nombre, foto y experiencia en el sitio público.
create function ediciones_validar_profesor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.profesor_id is not null
     and not exists (select 1 from profiles p where p.id = new.profesor_id and p.rol = 'profesor') then
    raise exception 'El profesor elegido no es un profesor';
  end if;
  return new;
end $$;
create trigger ediciones_validar_profesor before insert or update of profesor_id on ediciones
  for each row execute function ediciones_validar_profesor();

-- 2. Textos obligatorios no vacíos. NOT VALID: se exige en lo que se escriba de ahora en más sin fallar por filas viejas.
alter table cursos add constraint cursos_nombre_no_vacio check (btrim(nombre) <> '') not valid;
alter table cursos add constraint cursos_slug_no_vacio check (btrim(slug) <> '') not valid;
alter table profiles add constraint profiles_nombre_no_vacio check (btrim(nombre) <> '' and btrim(apellido) <> '') not valid;
