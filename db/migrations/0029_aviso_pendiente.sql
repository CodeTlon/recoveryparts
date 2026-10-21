-- 0029 · Avisos de clases suspendidas/reprogramadas con reintento (RF-38).
-- Antes el aviso por mail dependía de un checkbox y se calculaba contra lo guardado justo antes: si el mail fallaba, el
-- calendario ya estaba guardado y nadie podía reintentar (la próxima vez «no había cambios»). Ahora cada clase lleva
-- `aviso_pendiente` hasta que el mail sale bien: guardar el calendario la marca cuando una clase pasa a suspendida o
-- reprogramada (o cambia de fecha estando así) y la limpia cuando deja de estarlo. Enviar los avisos baja la marca.
alter table clases add column aviso_pendiente boolean not null default false;

create or replace function guardar_calendario(p_edicion uuid, p_filas jsonb, p_version text default null) returns jsonb
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
  insert into clases (edicion_id, plan_clase_id, fecha, estado, aviso_pendiente)
    select p_edicion, (f ->> 'plan_clase_id')::uuid, (f ->> 'fecha')::date, (f ->> 'estado')::estado_clase,
           (f ->> 'estado') in ('suspendida', 'reprogramada')
    from jsonb_array_elements(p_filas) f
  on conflict (edicion_id, plan_clase_id) do update set
    fecha = excluded.fecha, estado = excluded.estado,
    aviso_pendiente = case
      when excluded.estado in ('suspendida', 'reprogramada')
        then clases.aviso_pendiente or clases.fecha is distinct from excluded.fecha or clases.estado is distinct from excluded.estado
      else false end;
  delete from clases where edicion_id = p_edicion
    and plan_clase_id not in (select (f ->> 'plan_clase_id')::uuid from jsonb_array_elements(p_filas) f);
  return v_previas;
end $$;
