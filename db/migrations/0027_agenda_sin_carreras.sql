-- 0027 · Agenda de ediciones sin carreras ni horarios solapados.
-- 1. Dos horarios del mismo día que se pisan DENTRO de una edición ("1 18:00-20:00" y "1 19:00-21:00") pasaban:
--    la regla solo comparaba contra OTRAS ediciones.
-- 2. validar_edicion y validar_horario miran lo ya guardado y deciden; si dos altas llegan a la vez, las dos ven
--    «libre» y las dos entran. Ahora toman un lock de transacción por curso, aula y profesor (en orden fijo, para no
--    generar deadlocks): la segunda espera a que la primera confirme y recién ahí valida, viendo su fila.
create function bloquear_agenda(p_curso uuid, p_aula uuid, p_prof uuid) returns void
language plpgsql set search_path = public as $$
declare k text;
begin
  for k in select x from unnest(array[
      case when p_curso is not null then 'curso:' || p_curso end,
      case when p_aula  is not null then 'aula:'  || p_aula  end,
      case when p_prof  is not null then 'prof:'  || p_prof  end]) x where x is not null order by x loop
    perform pg_advisory_xact_lock(hashtextextended('agenda:' || k, 0));
  end loop;
end $$;

create or replace function validar_edicion(p_id uuid, p_curso uuid, p_inicio date, p_aula uuid, p_prof uuid, p_activo boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_per daterange := periodo_de(p_id, p_inicio); v_otra date; v_hay boolean;
begin
  if not p_activo then return; end if;
  perform bloquear_agenda(p_curso, p_aula, p_prof);
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

create or replace function validar_horario() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  -- Dentro de la misma edición dos horarios no pueden pisarse (siempre, esté activa o no).
  if exists (
    select 1 from horarios_curso h
    where h.edicion_id = new.edicion_id and h.id <> new.id and h.dia_semana = new.dia_semana
      and h.hora_inicio < new.hora_fin and h.hora_fin > new.hora_inicio
  ) then
    raise exception 'Hay horarios superpuestos el mismo día en esta edición.';
  end if;
  select id, curso_id, fecha_inicio, aula_id, profesor_id, activo into e from ediciones where id = new.edicion_id;
  if not e.activo then return new; end if;
  perform bloquear_agenda(e.curso_id, e.aula_id, e.profesor_id);
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
revoke execute on function bloquear_agenda(uuid, uuid, uuid) from public, anon, authenticated;
