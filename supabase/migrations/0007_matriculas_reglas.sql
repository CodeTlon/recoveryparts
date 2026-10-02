-- Reglas de negocio de matrículas garantizadas en la base (no solo en la app).
--  · Estados vigentes: activo, desertor, finalizado. 'suspendido' e 'inactivo' quedan
--    en el enum por compatibilidad pero ya no se pueden usar en filas nuevas (NOT VALID
--    no revalida filas históricas).
--  · Cupo: no se puede superar al matricular.
--  · Desertor: motivo y fecha obligatorios; N° de clase calculado acá (RF-55): clases
--    'programada' con fecha <= fecha de deserción (las suspendidas/reprogramadas no cuentan).
--  · Solo el administrador reactiva a un desertor; el profesor solo puede marcar Desertor
--    en SUS cursos (RF-15) y no puede tocar nada más de la matrícula.
--  · Una matrícula nunca se borra (RF-54).

alter table matriculas
  add constraint matriculas_estado_vigente check (estado in ('activo', 'desertor', 'finalizado')) not valid;

create or replace function public.matriculas_reglas() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_rol text := (select current_user_rol()::text);
begin
  if tg_op = 'INSERT' then
    if (select count(*) from matriculas where curso_id = new.curso_id and estado = 'activo')
         >= (select cupo_total from cursos where id = new.curso_id) then
      raise exception 'El curso no tiene cupos disponibles';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if v_rol = 'profesor' then
      if not (old.estado = 'activo' and new.estado = 'desertor')
         or new.alumno_id <> old.alumno_id or new.curso_id <> old.curso_id then
        raise exception 'Solo un administrador puede hacer ese cambio';
      end if;
    end if;
    if old.estado = 'desertor' and new.estado <> 'desertor' and auth.uid() is not null and v_rol is distinct from 'administrador' then
      raise exception 'Solo un administrador puede reactivar a un desertor';
    end if;
  end if;

  if new.estado = 'desertor' then
    new.fecha_desercion := coalesce(new.fecha_desercion, current_date);
    if length(trim(coalesce(new.motivo_baja, ''))) = 0 then
      raise exception 'El motivo es obligatorio para marcar deserción';
    end if;
    new.n_clase_desercion := (select count(*)::int from clases
      where curso_id = new.curso_id and estado = 'programada' and fecha <= new.fecha_desercion);
    if tg_op = 'INSERT' or old.estado is distinct from 'desertor' then
      new.marcado_por := coalesce(new.marcado_por, auth.uid());
      new.marcado_en := now();
    end if;
  elsif tg_op = 'UPDATE' and old.estado = 'desertor' then
    new.motivo_baja := null; new.fecha_desercion := null; new.n_clase_desercion := null; -- reactivación (RF-56)
  end if;
  return new;
end $$;

drop trigger if exists matriculas_reglas_biu on matriculas;
create trigger matriculas_reglas_biu before insert or update on matriculas
  for each row execute function public.matriculas_reglas();

create or replace function public.matriculas_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'Las matrículas no se eliminan: marcá al alumno como Desertor';
end $$;
drop trigger if exists matriculas_bd on matriculas;
create trigger matriculas_bd before delete on matriculas
  for each row execute function public.matriculas_no_delete();

-- El profesor puede actualizar matrículas de SUS cursos (el trigger limita a "marcar Desertor").
create policy "matriculas profesor marca desertor" on matriculas for update to authenticated
  using (current_user_rol() = 'profesor' and exists (select 1 from cursos c where c.id = matriculas.curso_id and c.profesor_id = auth.uid()))
  with check (current_user_rol() = 'profesor' and exists (select 1 from cursos c where c.id = matriculas.curso_id and c.profesor_id = auth.uid()));
