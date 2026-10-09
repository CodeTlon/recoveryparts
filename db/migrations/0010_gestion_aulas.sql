-- 0010 · Gestión de aulas (RF-03).
-- El aula es un catálogo propio: su capacidad es el techo físico y el cupo de cada curso
-- es el límite elegido, nunca mayor (cupo ≤ capacidad). Las aulas no se borran: baja lógica.
-- Todas las reglas viven en la base (un admin con JWT puede escribir directo por PostgREST).

-- ── Tabla ────────────────────────────────────────────────────────────────────────────────────
alter table aulas add column if not exists activa boolean not null default true;
-- Nombre único sin distinguir mayúsculas ni espacios de más («Aula 1» = « aula 1 »).
create unique index if not exists aulas_nombre_unico on aulas (lower(btrim(nombre)));

-- ── Reglas sobre el aula ─────────────────────────────────────────────────────────────────────
-- · Capacidad obligatoria en aulas nuevas (las existentes sin capacidad no se validan hasta cargarla).
-- · Una capacidad cargada no se puede volver a dejar vacía.
-- · No se puede bajar la capacidad por debajo del cupo de un curso activo del aula.
-- · No se puede dar de baja un aula con cursos activos.
create or replace function aulas_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_cursos text;
begin
  if tg_op = 'INSERT' and new.capacidad is null then
    raise exception 'Cargá la capacidad del aula.';
  end if;
  if tg_op = 'UPDATE' then
    if old.capacidad is not null and new.capacidad is null then
      raise exception 'La capacidad del aula no se puede dejar vacía.';
    end if;
    if new.capacidad is not null and new.capacidad is distinct from old.capacidad then
      select string_agg(format('%s (cupo %s)', nombre, cupo), ', ' order by nombre) into v_cursos
      from cursos where aula_id = new.id and activo and cupo > new.capacidad;
      if v_cursos is not null then
        raise exception 'La capacidad del aula no puede ser menor que el cupo de: %.', v_cursos;
      end if;
    end if;
    if old.activa and not new.activa then
      select string_agg(nombre, ', ' order by nombre) into v_cursos
      from cursos where aula_id = new.id and activo;
      if v_cursos is not null then
        raise exception 'No se puede dar de baja el aula: la usan los cursos activos %.', v_cursos;
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger aulas_biu before insert or update on aulas
  for each row execute function aulas_before_write();

-- Las aulas nunca se borran (los cursos viejos conservan el dato).
create or replace function aulas_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'Las aulas no se borran: dala de baja.';
end $$;
create trigger aulas_bd before delete on aulas
  for each row execute function aulas_no_delete();

-- ── Reglas sobre el curso ────────────────────────────────────────────────────────────────────
-- · No se asigna (ni se reactiva un curso en) un aula dada de baja; un curso que ya la tenía
--   se puede seguir editando.
-- · El cupo no supera la capacidad del aula (si el aula la tiene cargada).
-- El `for share` serializa con un cambio simultáneo de capacidad o de estado del aula.
create or replace function cursos_validar_aula() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if not new.activo or new.aula_id is null then
    return new;
  end if;
  select nombre, capacidad, activa into a from aulas where id = new.aula_id for share;
  if not a.activa and (tg_op = 'INSERT' or new.aula_id is distinct from old.aula_id or not old.activo) then
    raise exception 'El aula % está dada de baja.', a.nombre;
  end if;
  if a.capacidad is not null and new.cupo > a.capacidad then
    raise exception 'El cupo (%) supera la capacidad del aula % (%).', new.cupo, a.nombre, a.capacidad;
  end if;
  return new;
end $$;
create trigger cursos_validar_aula before insert or update of cupo, aula_id, activo on cursos
  for each row execute function cursos_validar_aula();

-- ── Auditoría ────────────────────────────────────────────────────────────────────────────────
create trigger audit_aulas after insert or update on aulas
  for each row execute function audit_trigger();
