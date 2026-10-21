-- 0026 · Detectar que el calendario cambió mientras se lo editaba.
-- guardar_calendario (0022) serializa los guardados, pero quien tenía la pantalla abierta desde antes guardaba su foto
-- vieja y pisaba (o borraba) lo que otra persona había cargado. Ahora el formulario lleva la versión del calendario que
-- se mostró y la base la compara, ya dentro del lock, con la actual: si difiere, no guarda y pide recargar.
-- SECURITY INVOKER: la versión se calcula con lo que el usuario puede ver (RLS), igual que el guardado.
create function calendario_version(p_edicion uuid) returns text
language sql stable set search_path = public as $$
  select md5(coalesce(string_agg(plan_clase_id::text || '|' || fecha::text || '|' || estado::text, ';' order by plan_clase_id), ''))
  from clases where edicion_id = p_edicion
$$;
revoke all on function calendario_version(uuid) from public, anon;
grant execute on function calendario_version(uuid) to authenticated, service_role;

drop function guardar_calendario(uuid, jsonb);
create function guardar_calendario(p_edicion uuid, p_filas jsonb, p_version text default null) returns jsonb
language plpgsql set search_path = public as $$
declare v_previas jsonb;
begin
  if jsonb_typeof(p_filas) <> 'array' then raise exception 'Calendario inválido'; end if;
  perform pg_advisory_xact_lock(hashtextextended('calendario:' || p_edicion::text, 0));
  if p_version is not null and p_version <> calendario_version(p_edicion) then
    raise exception 'El calendario cambió mientras lo editabas. Recargá la página y volvé a hacer tus cambios.';
  end if;
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
revoke all on function guardar_calendario(uuid, jsonb, text) from public, anon;
grant execute on function guardar_calendario(uuid, jsonb, text) to authenticated, service_role;
