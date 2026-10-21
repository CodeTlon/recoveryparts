-- 0022 · Calendario de la edición: guardado atómico y trigger de deserción sin escrituras en vano.

-- 1. guardar_calendario: antes la action hacía SELECT + upsert + delete en tres transacciones. Si fallaba el delete
--    quedaba a medias, y dos guardados simultáneos se pisaban. Ahora es una sola transacción, serializada por edición
--    (advisory lock: no hace falta permiso de UPDATE sobre `ediciones`, que el profesor no tiene). SECURITY INVOKER:
--    RLS sigue decidiendo qué puede tocar cada rol. Devuelve las clases como estaban ANTES, para calcular los avisos
--    (RF-38) sobre la misma foto que se reemplazó.
create function guardar_calendario(p_edicion uuid, p_filas jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare v_previas jsonb;
begin
  if jsonb_typeof(p_filas) <> 'array' then raise exception 'Calendario inválido'; end if;
  perform pg_advisory_xact_lock(hashtextextended('calendario:' || p_edicion::text, 0));
  select coalesce(jsonb_agg(jsonb_build_object('plan_clase_id', plan_clase_id, 'fecha', fecha, 'estado', estado)), '[]'::jsonb)
    into v_previas from clases where edicion_id = p_edicion;
  insert into clases (edicion_id, plan_clase_id, fecha, estado)
    select p_edicion, (f ->> 'plan_clase_id')::uuid, (f ->> 'fecha')::date, (f ->> 'estado')::estado_clase
    from jsonb_array_elements(p_filas) f
  on conflict (edicion_id, plan_clase_id) do update set fecha = excluded.fecha, estado = excluded.estado;
  delete from clases where edicion_id = p_edicion
    and plan_clase_id not in (select (f ->> 'plan_clase_id')::uuid from jsonb_array_elements(p_filas) f);
  return v_previas;
end $$;
revoke all on function guardar_calendario(uuid, jsonb) from public, anon;
grant execute on function guardar_calendario(uuid, jsonb) to authenticated, service_role;

-- 2. Recalcular el N° de clase de los desertores SOLO si cambió. Antes el trigger (por fila de `clases`) reescribía a
--    todos los desertores de la edición en cada fila, y cada UPDATE generaba una fila en audit_log: guardar un
--    calendario de 30 clases con 6 desertores escribía ~180 filas de auditoría sin ningún cambio real.
create or replace function clases_recalcular_desercion() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_edicion uuid := coalesce(new.edicion_id, old.edicion_id);
begin
  update inscripciones set fecha_desercion = fecha_desercion
  where edicion_id = v_edicion and estado = 'desertor'
    and n_clase_desercion is distinct from calcular_n_clase(edicion_id, fecha_desercion);
  return null;
end $$;
