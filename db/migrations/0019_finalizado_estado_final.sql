-- 0019 · Finalizado es un estado final (igual que desertor).
-- La especificación (diagrama de estados de la inscripción) no permite salir de Finalizado. Hasta ahora el trigger
-- solo protegía a desertor: un UPDATE directo podía pasar finalizado → desertor (y perder el acceso de 3 meses, el
-- ZIP y contar en los reportes de deserción) o finalizado → activo.
-- Igual que la versión de la 0018, más el chequeo. Los seeds insertan filas ya finalizadas (INSERT): no se afectan.
create or replace function inscripciones_before_write() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.estado = 'desertor' and new.estado <> 'desertor' then
    raise exception 'Desertor es un estado final';
  end if;
  if tg_op = 'UPDATE' and old.estado = 'finalizado' and new.estado <> 'finalizado' then
    raise exception 'Finalizado es un estado final';
  end if;
  if new.estado = 'desertor' then
    new.n_clase_desercion := calcular_n_clase(new.edicion_id, new.fecha_desercion);
    if tg_op = 'INSERT' or old.estado <> 'desertor' then
      new.marcado_por := coalesce(new.marcado_por, auth.uid());
      new.marcado_en := now();
    end if;
  end if;
  -- Finalizado: se anota el día (si no vino cargado). Fuera de ese estado no hay fecha ni plazo.
  if new.estado = 'finalizado' then
    new.finalizado_el := coalesce(new.finalizado_el, hoy_ar());
  else
    new.finalizado_el := null;
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
