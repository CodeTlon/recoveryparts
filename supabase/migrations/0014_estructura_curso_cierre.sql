-- 0014 · Estructura del curso: cierre (RF-26, RF-31, RF-32, RF-37).
-- Borra lo viejo que convivía desde la 0013 (viñetas de los módulos, número de clase en el material y en el
-- calendario), activa la regla de estructura como constraint trigger y pasa la liberación del material a
-- SIEMPRE MANUAL: el profesor libera cada material en su edición; nada se libera solo por fecha.

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 1. Ficha pública: solo los títulos de los módulos (RF-26). Nunca clases ni material.
-- ════════════════════════════════════════════════════════════════════════════════════════════
drop view if exists modulos_publicos;
alter table modulos_curso drop column items;
create view modulos_publicos with (security_invoker = false) as
select m.id, m.curso_id, m.orden, m.titulo
from modulos_curso m join cursos c on c.id = m.curso_id
where c.activo and c.tipo = 'curso';
grant select on modulos_publicos to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 2. Material y calendario: solo por id de clase
-- ════════════════════════════════════════════════════════════════════════════════════════════
create or replace function materiales_integridad() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.storage_path is distinct from old.storage_path or new.curso_id <> old.curso_id) then
    raise exception 'No se puede cambiar el archivo ni el curso de un material';
  end if;
  if new.plan_clase_id is not null and not exists (select 1 from plan_clases where id = new.plan_clase_id and curso_id = new.curso_id) then
    raise exception 'La clase no es de este curso';
  end if;
  return new;
end $$;
alter table materiales drop column clase_numero;

-- Calendario: la clase es del curso de la edición y no es anterior a su inicio.
create or replace function clases_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record; v_titulo text;
begin
  select ed.fecha_inicio, ed.curso_id into e from ediciones ed where ed.id = new.edicion_id;
  select titulo into v_titulo from plan_clases where id = new.plan_clase_id and curso_id = e.curso_id;
  if v_titulo is null then
    raise exception 'La clase no es de este curso.';
  end if;
  if e.fecha_inicio is not null and new.fecha < e.fecha_inicio then
    raise exception 'La clase «%» (%) es anterior al inicio de la edición (%).',
      v_titulo, to_char(new.fecha, 'DD/MM/YYYY'), to_char(e.fecha_inicio, 'DD/MM/YYYY');
  end if;
  return new;
end $$;
alter table clases drop column numero;
alter table clases alter column plan_clase_id set not null;

-- Mover el inicio de una edición: el mensaje nombra la clase por su título.
create or replace function ediciones_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record; v_insc int; v_clase record;
begin
  -- Fecha de inicio obligatoria en ediciones nuevas; una vez cargada no se vacía.
  if new.fecha_inicio is null and (tg_op = 'INSERT' or old.fecha_inicio is not null) then
    raise exception 'Cargá la fecha de inicio de la edición.';
  end if;
  -- Ninguna clase puede quedar antes del inicio de su edición.
  if tg_op = 'UPDATE' and new.fecha_inicio is distinct from old.fecha_inicio then
    select pc.titulo, cl.fecha into v_clase from clases cl join plan_clases pc on pc.id = cl.plan_clase_id
    where cl.edicion_id = new.id and cl.fecha < new.fecha_inicio order by cl.fecha limit 1;
    if found then
      raise exception 'La clase «%» (%) quedaría antes del inicio de la edición (%). Ajustá el calendario primero.',
        v_clase.titulo, to_char(v_clase.fecha, 'DD/MM/YYYY'), to_char(new.fecha_inicio, 'DD/MM/YYYY');
    end if;
  end if;
  if new.activo and (tg_op = 'INSERT' or not old.activo) and not (select activo from cursos where id = new.curso_id) then
    raise exception 'El curso está dado de baja.';
  end if;
  if new.activo and new.aula_id is not null then
    select nombre, capacidad, activa into a from aulas where id = new.aula_id for share;
    if not a.activa and (tg_op = 'INSERT' or new.aula_id is distinct from old.aula_id or not old.activo) then
      raise exception 'El aula % está dada de baja.', a.nombre;
    end if;
    if a.capacidad is not null and new.cupo > a.capacidad then
      raise exception 'El cupo (%) supera la capacidad del aula % (%).', new.cupo, a.nombre, a.capacidad;
    end if;
  end if;
  if tg_op = 'UPDATE' and new.cupo < old.cupo then
    select count(*) into v_insc from inscripciones where edicion_id = new.id;
    if new.cupo < v_insc then
      raise exception 'El cupo no puede ser menor que los alumnos ya asignados';
    end if;
  end if;
  if tg_op = 'INSERT' or new.fecha_inicio is distinct from old.fecha_inicio or new.aula_id is distinct from old.aula_id
     or new.profesor_id is distinct from old.profesor_id or (new.activo and not old.activo) then
    perform validar_edicion(new.id, new.curso_id, new.fecha_inicio, new.aula_id, new.profesor_id, new.activo);
  end if;
  return new;
end $$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 3. Guardar la estructura (sin la sincronización de números de la 0013)
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Admin, profesor de una edición activa del curso, o service role (carga de datos de prueba).
create or replace function guardar_estructura(p_curso uuid, p_modulos jsonb, p_clases jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[] := '{}'; v_cls uuid[] := '{}';
  v_id uuid; v_mod uuid; r record; v_txt text;
begin
  if not (es_admin() or es_profesor_del_curso(p_curso) or auth.role() = 'service_role') then
    raise exception 'No tenés permiso para editar este curso';
  end if;
  if jsonb_typeof(p_modulos) <> 'array' or jsonb_typeof(p_clases) <> 'array' then
    raise exception 'Estructura inválida';
  end if;
  if jsonb_array_length(p_clases) > 500 then raise exception 'El plan admite hasta 500 clases.'; end if;

  for r in select value v, ordinality - 1 i from jsonb_array_elements(p_modulos) with ordinality loop
    v_id := nullif(r.v ->> 'id', '')::uuid;
    if v_id is not null then
      update modulos_curso set titulo = btrim(r.v ->> 'titulo'), orden = r.i where id = v_id and curso_id = p_curso;
      if not found then raise exception 'Estructura inválida'; end if;
    else
      insert into modulos_curso (curso_id, orden, titulo) values (p_curso, r.i, btrim(r.v ->> 'titulo')) returning id into v_id;
    end if;
    v_ids := v_ids || v_id;
  end loop;

  for r in select value v, ordinality i from jsonb_array_elements(p_clases) with ordinality loop
    v_mod := null;
    if r.v ? 'modulo' and jsonb_typeof(r.v -> 'modulo') = 'number' then
      if (r.v ->> 'modulo')::int not between 0 and coalesce(array_length(v_ids, 1), 0) - 1 then
        raise exception 'Estructura inválida';
      end if;
      v_mod := v_ids[(r.v ->> 'modulo')::int + 1];
    end if;
    v_id := nullif(r.v ->> 'id', '')::uuid;
    if v_id is not null then
      update plan_clases set titulo = btrim(r.v ->> 'titulo'), tipo = (r.v ->> 'tipo')::tipo_clase, numero = r.i, modulo_id = v_mod
      where id = v_id and curso_id = p_curso;
      if not found then raise exception 'Estructura inválida'; end if;
    else
      insert into plan_clases (curso_id, numero, titulo, tipo, modulo_id)
      values (p_curso, r.i, btrim(r.v ->> 'titulo'), (r.v ->> 'tipo')::tipo_clase, v_mod) returning id into v_id;
    end if;
    v_cls := v_cls || v_id;
  end loop;

  select pc.titulo into v_txt from plan_clases pc
  where pc.curso_id = p_curso and pc.id <> all (v_cls)
    and exists (select 1 from clases cl where cl.plan_clase_id = pc.id) limit 1;
  if found then
    raise exception 'La clase «%» está en el calendario de una edición. Sacala del calendario antes de borrarla.', v_txt;
  end if;
  delete from plan_clases where curso_id = p_curso and id <> all (v_cls);   -- su material queda general
  delete from modulos_curso where curso_id = p_curso and id <> all (v_ids);
  -- La regla de estructura la valida el constraint trigger al final de la transacción.
end $$;
revoke execute on function guardar_estructura(uuid, jsonb, jsonb) from public, anon;

-- Módulos y plan ya no se reemplazan borrando y reinsertando (cambiarían los ids y el material se desataría).
create or replace function reemplazar_filas_curso(p_tabla text, p_id uuid, p_filas jsonb) returns void
language plpgsql set search_path = public as $$
declare v_cols text; v_fk text;
begin
  if p_tabla = 'horarios_curso' then v_fk := 'edicion_id';
  elsif p_tabla = 'kit_items' then v_fk := 'curso_id';
  else raise exception 'Tabla no permitida';
  end if;
  execute format('delete from %I where %I = $1', p_tabla, v_fk) using p_id;
  if jsonb_typeof(p_filas) = 'array' and jsonb_array_length(p_filas) > 0 then
    select string_agg(quote_ident(k), ', ') into v_cols from jsonb_object_keys(p_filas -> 0) k;
    execute format('insert into %1$I (%2$s) select %2$s from jsonb_populate_recordset(null::%1$I, $1)', p_tabla, v_cols)
      using p_filas;
  end if;
end $$;
revoke execute on function reemplazar_filas_curso(text, uuid, jsonb) from public, anon;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 4. Regla de estructura en la base (al final de cada transacción)
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Curso: toda clase en un módulo, ningún módulo vacío, clases de un módulo juntas. Taller: sin módulos.
create function estructura_validar_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'cursos' then
    perform validar_estructura(new.id);
  else
    perform validar_estructura(coalesce(new.curso_id, old.curso_id));
    if tg_op = 'UPDATE' and new.curso_id is distinct from old.curso_id then perform validar_estructura(old.curso_id); end if;
  end if;
  return null;
end $$;
create constraint trigger plan_clases_estructura after insert or update or delete on plan_clases
  deferrable initially deferred for each row execute function estructura_validar_trigger();
create constraint trigger modulos_curso_estructura after insert or update or delete on modulos_curso
  deferrable initially deferred for each row execute function estructura_validar_trigger();
-- Solo si el tipo cambia de verdad: guardar los datos de un curso cargado antes de la estructura no debe fallar.
create constraint trigger cursos_estructura after update of tipo on cursos
  deferrable initially deferred for each row when (old.tipo is distinct from new.tipo)
  execute function estructura_validar_trigger();

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 5. Liberación SIEMPRE MANUAL (RF-32, cambiado en v0.12)
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- El alumno ve solo el material que el profesor liberó en SU edición. Que llegue la fecha de la clase no libera nada.
create or replace function material_visible(p_edicion uuid)
returns table (id uuid, tipo tipo_material, titulo text, url text, plan_clase_id uuid, clase_numero int, clase_titulo text,
               clase_tipo tipo_clase, modulo_id uuid, modulo_titulo text, modulo_orden int)
language sql stable security definer set search_path = public as $$
  select m.id, m.tipo, m.titulo, case when m.tipo = 'link' then m.url end,
         pc.id, pc.numero, pc.titulo, pc.tipo, mo.id, mo.titulo, mo.orden
  from ediciones e
  join materiales m on m.curso_id = e.curso_id
  join materiales_liberados ml on ml.edicion_id = e.id and ml.material_id = m.id
  left join plan_clases pc on pc.id = m.plan_clase_id
  left join modulos_curso mo on mo.id = pc.modulo_id
  where e.id = p_edicion and alumno_activo_en(p_edicion)
  order by mo.orden nulls last, pc.numero nulls last, m.creado_en
$$;
revoke execute on function material_visible(uuid) from public, anon;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 6. FKs a módulo/clase: NO ACTION en vez de RESTRICT (se chequea al final de la sentencia), así borrar un curso
--    en cascada no falla por el orden en que se borran sus módulos, clases y ediciones. Borrar a mano un módulo con
--    clases, o una clase con fechas en un calendario, sigue sin poder hacerse.
-- ════════════════════════════════════════════════════════════════════════════════════════════
alter table plan_clases drop constraint plan_clases_modulo_id_fkey,
  add constraint plan_clases_modulo_id_fkey foreign key (modulo_id) references modulos_curso(id);
alter table clases drop constraint clases_plan_clase_id_fkey,
  add constraint clases_plan_clase_id_fkey foreign key (plan_clase_id) references plan_clases(id);
