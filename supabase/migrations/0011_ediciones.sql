-- 0011 · Ediciones de curso (cursos recurrentes).
-- `cursos` queda como CATÁLOGO (contenido, precio, temario, kit, plan de clases, material) y cada vez
-- que se dicta es una EDICIÓN (fecha de inicio, horarios, aula, profesor, cupo, calendario, alumnos,
-- liberación del material, encuesta). Todas las reglas que eran del curso pasan a ser de la edición.
--
-- Migración de datos: cada curso existente genera UNA edición con el MISMO id. Así, las columnas
-- `curso_id` de inscripciones, clases, horarios y encuestas ya contienen ids de edición válidos y
-- solo se renombran a `edicion_id`. El material sigue siendo del curso (Storage no cambia).

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 1. Quitar lo que depende de columnas que se mueven o de funciones que cambian de firma
-- ════════════════════════════════════════════════════════════════════════════════════════════
drop view if exists cursos_publicos, horarios_publicos, modulos_publicos, kit_publico;

drop trigger if exists cursos_cupo_bu on cursos;
drop trigger if exists cursos_validar_aula on cursos;
drop trigger if exists cursos_validar_choque on cursos;
drop trigger if exists materiales_integridad on materiales;

drop policy if exists cursos_profesor on cursos;
drop policy if exists cursos_alumno on cursos;
drop policy if exists profiles_profesor_alumnos on profiles;
drop policy if exists horarios_staff on horarios_curso;
drop policy if exists clases_profesor on clases;
drop policy if exists insc_profesor on inscripciones;
drop policy if exists mat_profesor on materiales;
drop policy if exists kit_profesor on kit_items;
drop policy if exists kit_alumno on kit_items;
drop policy if exists enc_alumno on encuestas;
drop policy if exists materiales_staff_write on storage.objects;
drop policy if exists materiales_staff_update on storage.objects;
drop policy if exists materiales_staff_delete on storage.objects;
drop policy if exists materiales_staff_read on storage.objects;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 2. Ediciones (una por curso existente, con el mismo id)
-- ════════════════════════════════════════════════════════════════════════════════════════════
create table ediciones (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id),
  fecha_inicio date,
  aula_id uuid references aulas(id),
  profesor_id uuid references profiles(id),          -- un único profesor por edición (RF-18)
  cupo int not null check (cupo between 1 and 500),  -- mismo rango que valida la app
  activo boolean not null default true,              -- baja lógica de la edición
  creado_en timestamptz not null default now()
);
create index on ediciones (curso_id);
create index on ediciones (profesor_id);

insert into ediciones (id, curso_id, fecha_inicio, aula_id, profesor_id, cupo, activo, creado_en)
select id, id, fecha_inicio, aula_id, profesor_id, cupo, activo, creado_en from cursos;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 3. Plan de clases del curso (N° y título); el calendario de cada edición pone fecha y estado
-- ════════════════════════════════════════════════════════════════════════════════════════════
create table plan_clases (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  numero int not null check (numero between 1 and 500),
  titulo text not null check (length(btrim(titulo)) between 1 and 200),
  unique (curso_id, numero)
);
insert into plan_clases (curso_id, numero, titulo)
select distinct on (curso_id, numero) curso_id, numero, titulo from clases order by curso_id, numero;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 4. Material: sigue en el curso, asociado al N° de clase; la liberación manual es por edición
-- ════════════════════════════════════════════════════════════════════════════════════════════
alter table materiales add column clase_numero int check (clase_numero > 0);
update materiales m set clase_numero = cl.numero from clases cl where cl.id = m.clase_id;

create table materiales_liberados (
  edicion_id uuid not null references ediciones(id) on delete cascade,
  material_id uuid not null references materiales(id) on delete cascade,
  liberado_por uuid references profiles(id) default auth.uid(),
  liberado_en timestamptz not null default now(),
  primary key (edicion_id, material_id)
);
-- Lo que hoy ya está liberado (a mano o por fecha cumplida) queda liberado en su edición.
-- (Un material «general» con fecha futura pasa a liberación manual.)
insert into materiales_liberados (edicion_id, material_id, liberado_por)
select curso_id, id, null from materiales where liberado_manual or (liberar_en is not null and liberar_en <= hoy_ar());

alter table materiales drop column clase_id, drop column liberar_en, drop column liberado_manual;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 5. Lo que era del curso pasa a la edición (renombre + FK nueva; los valores ya son ids de edición)
-- ════════════════════════════════════════════════════════════════════════════════════════════
alter table horarios_curso rename column curso_id to edicion_id;
alter table horarios_curso drop constraint horarios_curso_curso_id_fkey,
  add constraint horarios_curso_edicion_id_fkey foreign key (edicion_id) references ediciones(id) on delete cascade;

alter table clases rename column curso_id to edicion_id;
alter table clases drop constraint clases_curso_id_fkey,
  add constraint clases_edicion_id_fkey foreign key (edicion_id) references ediciones(id) on delete cascade;
alter table clases drop column titulo;                       -- el título viene del plan del curso
alter table clases rename constraint clases_curso_id_numero_key to clases_edicion_id_numero_key;

alter table inscripciones rename column curso_id to edicion_id;  -- unique (alumno_id, edicion_id): R2
alter table inscripciones rename constraint inscripciones_alumno_id_curso_id_key to inscripciones_alumno_id_edicion_id_key;
alter table inscripciones drop constraint inscripciones_curso_id_fkey,
  add constraint inscripciones_edicion_id_fkey foreign key (edicion_id) references ediciones(id);

alter table encuestas rename column curso_id to edicion_id;  -- encuesta por edición (D5)
alter table encuestas drop constraint encuestas_curso_id_fkey,
  add constraint encuestas_edicion_id_fkey foreign key (edicion_id) references ediciones(id) on delete cascade;
alter table encuestas rename constraint encuestas_con_curso to encuestas_con_edicion;

alter table cursos drop column fecha_inicio, drop column aula_id, drop column profesor_id, drop column cupo;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 6. Helpers (security definer para evitar recursión de RLS)
-- ════════════════════════════════════════════════════════════════════════════════════════════
drop function if exists es_profesor_de(uuid);
drop function if exists alumno_activo_en(uuid);
drop function if exists calcular_n_clase(uuid, date);
drop function if exists material_visible(uuid);
drop function if exists proxima_clase_titulo(uuid);
drop function if exists reemplazar_filas_curso(text, uuid, jsonb);
drop function if exists reporte_ocupacion();
drop function if exists reporte_desercion();
drop function if exists cursos_validar_choque();
drop function if exists cursos_validar_aula();
drop function if exists validar_cupo();               -- su regla pasa a ediciones_before_write

-- Profesor de ESA edición.
create function es_profesor_de(p_edicion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from ediciones e
                 where e.id = p_edicion and e.profesor_id = auth.uid() and auth_rol() = 'profesor')
$$;

-- Profesor de alguna edición activa del curso: puede editar el material y el plan del curso (RF-31).
create function es_profesor_del_curso(p_curso uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from ediciones e
                 where e.curso_id = p_curso and e.activo and e.profesor_id = auth.uid() and auth_rol() = 'profesor')
$$;

-- El alumno cursa ESA edición (no desertor).
create function alumno_activo_en(p_edicion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from inscripciones i
                 where i.edicion_id = p_edicion and i.alumno_id = auth.uid()
                   and i.estado <> 'desertor' and auth_rol() = 'alumno')
$$;

-- El alumno cursa alguna edición del curso (no desertor): puede leer el contenido del curso.
create function alumno_del_curso(p_curso uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from inscripciones i join ediciones e on e.id = i.edicion_id
                 where e.curso_id = p_curso and i.alumno_id = auth.uid()
                   and i.estado <> 'desertor' and auth_rol() = 'alumno')
$$;

-- Período de una edición: de su primera a su última fecha (inicio o clases). Sin datos = sin límites.
-- `p_inicio` permite evaluar una fecha de inicio nueva antes de guardarla.
create function periodo_de(p_edicion uuid, p_inicio date) returns daterange
language sql stable security definer set search_path = public as $$
  select daterange(least(p_inicio, (select min(fecha) from clases where edicion_id = p_edicion)),
                   greatest(p_inicio, (select max(fecha) from clases where edicion_id = p_edicion)), '[]')
$$;

create function fecha_fin_edicion(p_edicion uuid) returns date
language sql stable security definer set search_path = public as $$
  select greatest(e.fecha_inicio, (select max(fecha) from clases where edicion_id = e.id))
  from ediciones e where e.id = p_edicion
$$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 7. Reglas por edición
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- Valida una edición activa: una edición por vez del mismo curso (R7) y sin choques de aula/profesor
-- con otras ediciones activas cuyos períodos se superponen (RF-17).
create function validar_edicion(p_id uuid, p_curso uuid, p_inicio date, p_aula uuid, p_prof uuid, p_activo boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_per daterange := periodo_de(p_id, p_inicio); v_otra date; v_hay boolean;
begin
  if not p_activo then return; end if;
  select e.fecha_inicio, true into v_otra, v_hay from ediciones e
  where e.curso_id = p_curso and e.id <> p_id and e.activo and periodo_de(e.id, e.fecha_inicio) && v_per
  order by e.fecha_inicio limit 1;
  if v_hay then
    raise exception 'Se superpone con la edición del % de este curso.', coalesce(to_char(v_otra, 'DD/MM/YYYY'), '(sin fecha)');
  end if;
  if exists (
    select 1 from horarios_curso h
    join horarios_curso o on o.edicion_id <> h.edicion_id and o.dia_semana = h.dia_semana
                         and o.hora_inicio < h.hora_fin and o.hora_fin > h.hora_inicio
    join ediciones e on e.id = o.edicion_id and e.activo
    join cursos c on c.id = e.curso_id and c.activo
    where h.edicion_id = p_id
      and ((p_aula is not null and e.aula_id = p_aula) or (p_prof is not null and e.profesor_id = p_prof))
      and periodo_de(e.id, e.fecha_inicio) && v_per
  ) then
    raise exception 'Superposición de aula o profesor en ese día y horario';
  end if;
end $$;

-- Edición: curso activo, aula activa con capacidad (RF-03), cupo ≥ inscriptos, una por vez y sin choques.
create function ediciones_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record; v_insc int; v_clase record;
begin
  -- Fecha de inicio obligatoria en ediciones nuevas; una vez cargada no se vacía.
  if new.fecha_inicio is null and (tg_op = 'INSERT' or old.fecha_inicio is not null) then
    raise exception 'Cargá la fecha de inicio de la edición.';
  end if;
  -- Ninguna clase puede quedar antes del inicio de su edición.
  if tg_op = 'UPDATE' and new.fecha_inicio is distinct from old.fecha_inicio then
    select numero, fecha into v_clase from clases where edicion_id = new.id and fecha < new.fecha_inicio order by fecha limit 1;
    if found then
      raise exception 'La clase % (%) quedaría antes del inicio de la edición (%). Ajustá el calendario primero.',
        v_clase.numero, to_char(v_clase.fecha, 'DD/MM/YYYY'), to_char(new.fecha_inicio, 'DD/MM/YYYY');
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
create trigger ediciones_biu before insert or update on ediciones
  for each row execute function ediciones_before_write();

-- Reactivar un curso vuelve a poner en juego sus ediciones activas: se revalidan aula, capacidad y choques.
create function cursos_before_reactivar() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record; a record;
begin
  if new.activo and not old.activo then
    for e in select * from ediciones where curso_id = new.id and activo loop
      if e.aula_id is not null then
        select nombre, capacidad, activa into a from aulas where id = e.aula_id;
        if not a.activa then
          raise exception 'El aula % de la edición del % está dada de baja.', a.nombre, to_char(e.fecha_inicio, 'DD/MM/YYYY');
        end if;
        if a.capacidad is not null and e.cupo > a.capacidad then
          raise exception 'El cupo (%) supera la capacidad del aula % (%).', e.cupo, a.nombre, a.capacidad;
        end if;
      end if;
      perform validar_edicion(e.id, e.curso_id, e.fecha_inicio, e.aula_id, e.profesor_id, true);
    end loop;
  end if;
  return new;
end $$;
create trigger cursos_reactivar before update of activo on cursos
  for each row execute function cursos_before_reactivar();

-- Horario nuevo/editado: sin choque de aula/profesor con otras ediciones activas que se superpongan en el tiempo.
create or replace function validar_horario() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select id, curso_id, fecha_inicio, aula_id, profesor_id, activo into e from ediciones where id = new.edicion_id;
  if not e.activo then return new; end if;
  if exists (
    select 1 from horarios_curso h join ediciones o on o.id = h.edicion_id and o.activo
    join cursos c on c.id = o.curso_id and c.activo
    where h.id <> new.id and o.id <> new.edicion_id
      and h.dia_semana = new.dia_semana and h.hora_inicio < new.hora_fin and h.hora_fin > new.hora_inicio
      and ((e.aula_id is not null and o.aula_id = e.aula_id) or (e.profesor_id is not null and o.profesor_id = e.profesor_id))
      and periodo_de(o.id, o.fecha_inicio) && periodo_de(e.id, e.fecha_inicio)
  ) then
    raise exception 'Superposición de aula o profesor en ese día y horario';
  end if;
  return new;
end $$;

-- Calendario: cada clase existe en el plan del curso y no es anterior al inicio de la edición.
create function clases_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select ed.fecha_inicio, ed.curso_id into e from ediciones ed where ed.id = new.edicion_id;
  if not exists (select 1 from plan_clases where curso_id = e.curso_id and numero = new.numero) then
    raise exception 'La clase % no está en el plan de clases del curso.', new.numero;
  end if;
  if e.fecha_inicio is not null and new.fecha < e.fecha_inicio then
    raise exception 'La clase % (%) es anterior al inicio de la edición (%).',
      new.numero, to_char(new.fecha, 'DD/MM/YYYY'), to_char(e.fecha_inicio, 'DD/MM/YYYY');
  end if;
  return new;
end $$;
create trigger clases_biu before insert or update on clases
  for each row execute function clases_before_write();

-- Cambiar el calendario cambia el período: se revalida la edición.
create function clases_validar_periodo() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select id, curso_id, fecha_inicio, aula_id, profesor_id, activo into e
  from ediciones where id = coalesce(new.edicion_id, old.edicion_id);
  if found then
    perform validar_edicion(e.id, e.curso_id, e.fecha_inicio, e.aula_id, e.profesor_id, e.activo);
  end if;
  return null;
end $$;
create constraint trigger clases_validar_periodo after insert or update or delete on clases
  deferrable initially deferred for each row execute function clases_validar_periodo();

-- N° de clase de deserción (RF-55): clases programadas de la edición con fecha <= la de deserción.
create function calcular_n_clase(p_edicion uuid, p_fecha date) returns int
language sql stable as $$
  select count(*)::int from clases
  where edicion_id = p_edicion and fecha <= p_fecha and estado = 'programada'
$$;

create or replace function inscripciones_before_write() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.estado = 'desertor' and new.estado <> 'desertor' then
    raise exception 'Desertor es un estado final';
  end if;
  if new.estado = 'desertor' then
    new.n_clase_desercion := calcular_n_clase(new.edicion_id, new.fecha_desercion);
    if tg_op = 'INSERT' or old.estado <> 'desertor' then
      new.marcado_por := coalesce(new.marcado_por, auth.uid());
      new.marcado_en := now();
    end if;
  end if;
  if tg_op = 'INSERT' then
    perform 1 from ediciones where id = new.edicion_id for update;
    if (select count(*) from inscripciones where edicion_id = new.edicion_id)
       >= (select cupo from ediciones where id = new.edicion_id) then
      raise exception 'El curso no tiene cupos disponibles';
    end if;
  end if;
  return new;
end $$;

create or replace function clases_recalcular_desercion() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_edicion uuid := coalesce(new.edicion_id, old.edicion_id);
begin
  update inscripciones set fecha_desercion = fecha_desercion
  where edicion_id = v_edicion and estado = 'desertor';
  return null;
end $$;

-- Aulas (0010): las reglas miran ediciones activas de cursos activos.
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
      select string_agg(format('%s · %s (cupo %s)', c.nombre, to_char(e.fecha_inicio, 'MM/YYYY'), e.cupo), ', ' order by c.nombre, e.fecha_inicio) into v_cursos
      from ediciones e join cursos c on c.id = e.curso_id and c.activo
      where e.aula_id = new.id and e.activo and e.cupo > new.capacidad;
      if v_cursos is not null then
        raise exception 'La capacidad del aula no puede ser menor que el cupo de: %.', v_cursos;
      end if;
    end if;
    if old.activa and not new.activa then
      select string_agg(format('%s · %s', c.nombre, to_char(e.fecha_inicio, 'MM/YYYY')), ', ' order by c.nombre, e.fecha_inicio) into v_cursos
      from ediciones e join cursos c on c.id = e.curso_id and c.activo
      where e.aula_id = new.id and e.activo;
      if v_cursos is not null then
        raise exception 'No se puede dar de baja el aula: la usan los cursos activos %.', v_cursos;
      end if;
    end if;
  end if;
  return new;
end $$;

-- Material: no se cambia el archivo ni el curso.
create or replace function materiales_integridad() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.storage_path is distinct from old.storage_path or new.curso_id <> old.curso_id) then
    raise exception 'No se puede cambiar el archivo ni el curso de un material';
  end if;
  return new;
end $$;
create trigger materiales_integridad before insert or update on materiales
  for each row execute function materiales_integridad();

-- Liberación por edición: el material tiene que ser del curso de esa edición.
create function materiales_liberados_integridad() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from materiales m join ediciones e on e.curso_id = m.curso_id
                 where m.id = new.material_id and e.id = new.edicion_id) then
    raise exception 'El material no pertenece al curso de esa edición';
  end if;
  return new;
end $$;
create trigger materiales_liberados_integridad before insert or update on materiales_liberados
  for each row execute function materiales_liberados_integridad();

create trigger audit_ediciones after insert or update on ediciones
  for each row execute function audit_trigger();

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 8. Funciones que usa la app
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- Material visible para el alumno en SU edición (RF-32, RF-37): liberado a mano en esa edición, o la clase
-- de ese N° ya llegó en el calendario de la edición (y no está suspendida).
create function material_visible(p_edicion uuid)
returns table (id uuid, tipo tipo_material, titulo text, url text, clase_numero int, clase_titulo text)
language sql stable security definer set search_path = public as $$
  select m.id, m.tipo, m.titulo, case when m.tipo = 'link' then m.url end, m.clase_numero, pc.titulo
  from ediciones e
  join materiales m on m.curso_id = e.curso_id
  left join plan_clases pc on pc.curso_id = e.curso_id and pc.numero = m.clase_numero
  where e.id = p_edicion and alumno_activo_en(p_edicion)
    and (exists (select 1 from materiales_liberados ml where ml.edicion_id = e.id and ml.material_id = m.id)
         or exists (select 1 from clases cl where cl.edicion_id = e.id and cl.numero = m.clase_numero
                    and cl.estado <> 'suspendida' and cl.fecha <= hoy_ar()))
  order by m.clase_numero nulls last, m.creado_en
$$;

create function proxima_clase_titulo(p_edicion uuid)
returns table (numero int, fecha date, titulo text)
language sql stable security definer set search_path = public as $$
  select cl.numero, cl.fecha, pc.titulo
  from clases cl
  join ediciones e on e.id = cl.edicion_id
  left join plan_clases pc on pc.curso_id = e.curso_id and pc.numero = cl.numero
  where cl.edicion_id = p_edicion and cl.fecha >= hoy_ar() and cl.estado = 'programada'
    and (alumno_activo_en(p_edicion) or es_profesor_de(p_edicion) or es_admin())
  order by cl.fecha limit 1
$$;

-- Reemplazo atómico de filas hijas: horarios por edición; módulos y kit por curso.
create function reemplazar_filas_curso(p_tabla text, p_id uuid, p_filas jsonb) returns void
language plpgsql set search_path = public as $$
declare v_cols text; v_fk text;
begin
  if p_tabla = 'horarios_curso' then v_fk := 'edicion_id';
  elsif p_tabla in ('modulos_curso', 'kit_items', 'plan_clases') then v_fk := 'curso_id';
  else raise exception 'Tabla no permitida';
  end if;
  execute format('delete from %I where %I = $1', p_tabla, v_fk) using p_id;
  if jsonb_typeof(p_filas) = 'array' and jsonb_array_length(p_filas) > 0 then
    select string_agg(quote_ident(k), ', ') into v_cols from jsonb_object_keys(p_filas -> 0) k;
    execute format('insert into %1$I (%2$s) select %2$s from jsonb_populate_recordset(null::%1$I, $1)', p_tabla, v_cols)
      using p_filas;
  end if;
end $$;

create or replace function responder_encuesta(p_encuesta uuid, p_respuestas jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_edicion uuid; v_preg jsonb; r record; v_tipo text;
begin
  select edicion_id, preguntas into v_edicion, v_preg from encuestas where id = p_encuesta and activa;
  if v_edicion is null or not alumno_activo_en(v_edicion) then
    raise exception 'No podés responder esta encuesta';
  end if;
  if jsonb_typeof(p_respuestas) <> 'object' or jsonb_typeof(v_preg) <> 'array' then
    raise exception 'Respuestas inválidas';
  end if;
  for r in select key, value from jsonb_each(p_respuestas) loop
    if r.key !~ '^[0-9]+$' or r.key::int >= jsonb_array_length(v_preg) or jsonb_typeof(r.value) <> 'string' then
      raise exception 'Respuestas inválidas';
    end if;
    v_tipo := v_preg -> r.key::int ->> 'tipo';
    if v_tipo = 'puntaje' and (r.value #>> '{}') !~ '^[1-5]$' then
      raise exception 'El puntaje debe estar entre 1 y 5';
    end if;
    if length(r.value #>> '{}') > 2000 then raise exception 'Respuesta demasiado larga'; end if;
  end loop;
  insert into encuesta_completadas (encuesta_id, alumno_id) values (p_encuesta, auth.uid());
  insert into encuesta_respuestas (encuesta_id, respuestas) values (p_encuesta, p_respuestas);
end $$;

-- Reportes por edición (solo admin; la app hoy calcula en ReportesPanel, se mantienen coherentes).
create function reporte_ocupacion()
returns table (edicion_id uuid, curso text, fecha_inicio date, cupo int, inscriptos int, ocupacion_pct numeric)
language sql stable security definer set search_path = public as $$
  select e.id, c.nombre, e.fecha_inicio, e.cupo,
         (select count(*)::int from inscripciones i where i.edicion_id = e.id),
         round(100.0 * (select count(*) from inscripciones i where i.edicion_id = e.id) / e.cupo, 1)
  from ediciones e join cursos c on c.id = e.curso_id where es_admin() order by 6 desc
$$;

create function reporte_desercion()
returns table (edicion_id uuid, curso text, fecha_inicio date, total int, desertores int, desercion_pct numeric, n_clase int, cantidad int)
language sql stable security definer set search_path = public as $$
  select e.id, c.nombre, e.fecha_inicio,
         (select count(*)::int from inscripciones i where i.edicion_id = e.id),
         (select count(*)::int from inscripciones i where i.edicion_id = e.id and i.estado = 'desertor'),
         round(100.0 * (select count(*) from inscripciones i where i.edicion_id = e.id and i.estado = 'desertor')
               / nullif((select count(*) from inscripciones i where i.edicion_id = e.id), 0), 1),
         d.n_clase_desercion, d.cant::int
  from ediciones e join cursos c on c.id = e.curso_id
  left join lateral (
    select n_clase_desercion, count(*) cant from inscripciones i
    where i.edicion_id = e.id and i.estado = 'desertor' group by 1
  ) d on true
  where es_admin() order by c.nombre, e.fecha_inicio, d.n_clase_desercion
$$;

revoke execute on function material_visible(uuid) from public, anon;
revoke execute on function reemplazar_filas_curso(text, uuid, jsonb) from public, anon;
revoke execute on function reporte_ocupacion() from public, anon;
revoke execute on function reporte_desercion() from public, anon;
revoke execute on function validar_edicion(uuid, uuid, date, uuid, uuid, boolean) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 9. Vistas públicas
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Próximas ediciones abiertas (empiezan hoy o después) de cursos activos.
create view ediciones_publicas with (security_invoker = false) as
select e.id, e.curso_id, e.fecha_inicio, fecha_fin_edicion(e.id) as fecha_fin, e.cupo,
       greatest(e.cupo - (select count(*) from inscripciones i where i.edicion_id = e.id), 0)::int as cupos_disponibles,
       a.nombre as aula,
       p.nombre || ' ' || p.apellido as profesor_nombre,
       p.foto_url as profesor_foto, p.experiencia as profesor_experiencia,
       p.certificaciones as profesor_certificaciones
from ediciones e
join cursos c on c.id = e.curso_id and c.activo
left join aulas a on a.id = e.aula_id
left join profiles p on p.id = e.profesor_id
where e.activo and e.fecha_inicio >= hoy_ar();

-- Catálogo: un curso por fila con los datos de su PRÓXIMA edición (null = «Próximamente nuevas fechas»).
create view cursos_publicos with (security_invoker = false) as
select c.id, c.slug, c.nombre, c.area, c.tipo, c.nivel, c.descripcion, c.requisitos,
       c.imagen_url, c.video_url, c.modalidad, c.duracion_semanas,
       c.precio, c.descuento_pct, c.precio_actualizado_en, c.destacado, c.orden,
       px.id as edicion_id, px.fecha_inicio, px.cupo, px.cupos_disponibles, px.aula,
       px.profesor_nombre, px.profesor_foto, px.profesor_experiencia, px.profesor_certificaciones,
       (select count(*)::int from ediciones_publicas ep where ep.curso_id = c.id) as ediciones_abiertas
from cursos c
left join lateral (
  select * from ediciones_publicas ep where ep.curso_id = c.id order by ep.fecha_inicio limit 1
) px on true
where c.activo;

create view horarios_publicos with (security_invoker = false) as
select h.id, h.edicion_id, ep.curso_id, h.dia_semana, h.hora_inicio, h.hora_fin
from horarios_curso h join ediciones_publicas ep on ep.id = h.edicion_id;

create view modulos_publicos with (security_invoker = false) as
select m.* from modulos_curso m join cursos c on c.id = m.curso_id where c.activo;

create view kit_publico with (security_invoker = false) as
select k.id, k.curso_id, k.orden, k.nombre, k.descripcion, k.precio, k.link_externo, k.requerido
from kit_items k join cursos c on c.id = k.curso_id where c.activo;

grant select on ediciones_publicas, cursos_publicos, horarios_publicos, modulos_publicos, kit_publico to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 10. RLS
-- ════════════════════════════════════════════════════════════════════════════════════════════
alter table ediciones enable row level security;
alter table plan_clases enable row level security;
alter table materiales_liberados enable row level security;

create policy ediciones_admin on ediciones for all using (es_admin()) with check (es_admin());
create policy ediciones_profesor on ediciones for select using (profesor_id = auth.uid() and auth_rol() = 'profesor');
-- El alumno ve sus ediciones (también la que desertó, para mostrarle el aviso).
create policy ediciones_alumno on ediciones for select using (
  auth_rol() = 'alumno' and exists (select 1 from inscripciones i where i.edicion_id = ediciones.id and i.alumno_id = auth.uid())
);

create policy cursos_profesor on cursos for select using (es_profesor_del_curso(id));
create policy cursos_alumno on cursos for select using (alumno_del_curso(id));

create policy profiles_profesor_alumnos on profiles for select using (
  auth_rol() = 'profesor' and exists (
    select 1 from inscripciones i join ediciones e on e.id = i.edicion_id
    where i.alumno_id = profiles.id and e.profesor_id = auth.uid()
  )
);

create policy horarios_staff on horarios_curso for select using (es_profesor_de(edicion_id) or alumno_activo_en(edicion_id));
create policy clases_profesor on clases for all using (es_profesor_de(edicion_id)) with check (es_profesor_de(edicion_id)); -- RF-31
create policy plan_admin on plan_clases for all using (es_admin()) with check (es_admin());
create policy plan_profesor on plan_clases for all using (es_profesor_del_curso(curso_id)) with check (es_profesor_del_curso(curso_id)); -- RF-31
create policy insc_profesor on inscripciones for select using (es_profesor_de(edicion_id));
create policy mat_profesor on materiales for all using (es_profesor_del_curso(curso_id)) with check (es_profesor_del_curso(curso_id));
create policy lib_admin on materiales_liberados for all using (es_admin()) with check (es_admin());
create policy lib_profesor on materiales_liberados for all using (es_profesor_de(edicion_id)) with check (es_profesor_de(edicion_id));
create policy kit_profesor on kit_items for select using (es_profesor_del_curso(curso_id));
create policy kit_alumno on kit_items for select using (alumno_del_curso(curso_id));
create policy enc_alumno on encuestas for select using (activa and alumno_activo_en(edicion_id));

-- Storage: el material es del curso (carpeta = curso_id).
create policy materiales_staff_write on storage.objects for insert to authenticated
  with check (bucket_id = 'materiales'
    and (es_admin() or es_profesor_del_curso(((storage.foldername(name))[1])::uuid)));
create policy materiales_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'materiales'
    and (es_admin() or es_profesor_del_curso(((storage.foldername(name))[1])::uuid)));
create policy materiales_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'materiales'
    and (es_admin() or es_profesor_del_curso(((storage.foldername(name))[1])::uuid)));
create policy materiales_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'materiales'
    and (es_admin() or es_profesor_del_curso(((storage.foldername(name))[1])::uuid)));
