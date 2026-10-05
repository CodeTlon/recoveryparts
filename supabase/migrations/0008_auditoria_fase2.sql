-- 0008 · Auditoría fase 2: fechas en hora de Córdoba, encuestas, N° de clase del desertor y cupo.

-- ── "Hoy" en Argentina (el servidor corre en UTC: desde las 21:00 current_date ya es mañana) ──
create or replace function hoy_ar() returns date language sql stable as $$
  select (now() at time zone 'America/Argentina/Cordoba')::date $$;

CREATE OR REPLACE FUNCTION public.material_visible(p_curso uuid)
 RETURNS TABLE(id uuid, tipo tipo_material, titulo text, url text, clase_numero integer, clase_titulo text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.id, m.tipo, m.titulo, case when m.tipo = 'link' then m.url end, cl.numero, cl.titulo
  from materiales m
  left join clases cl on cl.id = m.clase_id
  where m.curso_id = p_curso and alumno_activo_en(p_curso)
    and (m.liberado_manual or (m.liberar_en is not null and m.liberar_en <= hoy_ar()))
  order by cl.numero nulls last, m.creado_en
$function$;

CREATE OR REPLACE FUNCTION public.proxima_clase_titulo(p_curso uuid)
 RETURNS TABLE(numero integer, fecha date, titulo text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select cl.numero, cl.fecha, cl.titulo from clases cl
  where cl.curso_id = p_curso and cl.fecha >= hoy_ar() and cl.estado = 'programada'
    and (alumno_activo_en(p_curso) or es_profesor_de(p_curso) or es_admin())
  order by cl.fecha limit 1
$function$;

-- ── Encuestas ───────────────────────────────────────────────────────────────────────────────
-- Una encuesta sin curso quedaba "activa" pero ningún alumno podía verla ni responderla.
alter table encuestas add constraint encuestas_con_curso check (curso_id is not null) not valid;

-- Respuestas guardadas por índice de pregunta: se valida que el índice exista, que los puntajes
-- sean 1–5 y que los textos no sean enormes (la función se puede llamar directo por RPC).
create or replace function responder_encuesta(p_encuesta uuid, p_respuestas jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_curso uuid; v_preg jsonb; r record; v_tipo text;
begin
  select curso_id, preguntas into v_curso, v_preg from encuestas where id = p_encuesta and activa;
  if v_curso is null or not alumno_activo_en(v_curso) then
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
  insert into encuesta_completadas (encuesta_id, alumno_id) values (p_encuesta, auth.uid()); -- PK evita repetir
  insert into encuesta_respuestas (encuesta_id, respuestas) values (p_encuesta, p_respuestas);
end $$;
revoke execute on function responder_encuesta(uuid, jsonb) from public, anon;

-- ── N° de clase del desertor (RF-55) ────────────────────────────────────────────────────────
-- Se calculaba solo al escribir la inscripción: si después se suspende, agrega o borra una clase,
-- el número quedaba viejo. Este trigger lo recalcula (la propia inscripción lo vuelve a calcular).
create or replace function clases_recalcular_desercion() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_curso uuid := coalesce(new.curso_id, old.curso_id);
begin
  update inscripciones set fecha_desercion = fecha_desercion
  where curso_id = v_curso and estado = 'desertor';
  return null;
end $$;
create trigger clases_recalcular_desercion after insert or update or delete on clases
  for each row execute function clases_recalcular_desercion();

-- ── Cupo: dos altas simultáneas podían superarlo (se serializa con un lock sobre el curso) ──
create or replace function inscripciones_before_write() returns trigger
language plpgsql as $$
begin
  -- Desertor es estado final (no vuelve a Activo).
  if tg_op = 'UPDATE' and old.estado = 'desertor' and new.estado <> 'desertor' then
    raise exception 'Desertor es un estado final';
  end if;

  if new.estado = 'desertor' then
    new.n_clase_desercion := calcular_n_clase(new.curso_id, new.fecha_desercion);
    if tg_op = 'INSERT' or old.estado <> 'desertor' then
      new.marcado_por := coalesce(new.marcado_por, auth.uid());
      new.marcado_en := now();
    end if;
  end if;

  -- No superar el cupo al añadir alumnos.
  if tg_op = 'INSERT' then
    perform 1 from cursos where id = new.curso_id for update;
    if (select count(*) from inscripciones where curso_id = new.curso_id)
       >= (select cupo from cursos where id = new.curso_id) then
      raise exception 'El curso no tiene cupos disponibles';
    end if;
  end if;
  return new;
end $$;

-- ── Reemplazo atómico de filas hijas del curso (horarios, módulos, kit) ─────────────────────
-- Antes la app hacía delete + insert por separado: si el insert fallaba se perdía lo cargado.
-- SECURITY INVOKER: corre con los permisos de quien llama (RLS: solo admin escribe).
create or replace function reemplazar_filas_curso(p_tabla text, p_curso uuid, p_filas jsonb) returns void
language plpgsql set search_path = public as $$
declare v_cols text;
begin
  if p_tabla not in ('horarios_curso', 'modulos_curso', 'kit_items') then
    raise exception 'Tabla no permitida';
  end if;
  execute format('delete from %I where curso_id = $1', p_tabla) using p_curso;
  if jsonb_typeof(p_filas) = 'array' and jsonb_array_length(p_filas) > 0 then
    select string_agg(quote_ident(k), ', ') into v_cols from jsonb_object_keys(p_filas -> 0) k;
    execute format('insert into %1$I (%2$s) select %2$s from jsonb_populate_recordset(null::%1$I, $1)', p_tabla, v_cols)
      using p_filas;
  end if;
end $$;
revoke execute on function reemplazar_filas_curso(text, uuid, jsonb) from public, anon;

-- ── Cambiar aula o profesor de un curso también valida el choque de horarios (RF-17) ────────
create or replace function cursos_validar_choque() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.activo and exists (
    select 1 from horarios_curso h
    join horarios_curso o on o.curso_id <> h.curso_id and o.dia_semana = h.dia_semana
                         and o.hora_inicio < h.hora_fin and o.hora_fin > h.hora_inicio
    join cursos c on c.id = o.curso_id and c.activo
    where h.curso_id = new.id
      and ((new.aula_id is not null and c.aula_id = new.aula_id)
        or (new.profesor_id is not null and c.profesor_id = new.profesor_id))
  ) then
    raise exception 'Superposición de aula o profesor en ese día y horario';
  end if;
  return new;
end $$;
create trigger cursos_validar_choque before update of aula_id, profesor_id, activo on cursos
  for each row execute function cursos_validar_choque();
