-- 0018 · Acceso del alumno que terminó un curso: 3 meses desde que se finalizó (RF-34, RF-35).
-- Al finalizar, el alumno sigue entrando a su curso (material liberado, PDFs, links y el ZIP) durante 3 meses.
-- Vencido el plazo el curso sigue figurando como finalizado, pero el material ya no se puede abrir ni descargar.
-- Las encuestas no dependen de este plazo: se responden mientras estén activas y el alumno no sea desertor.
--
-- Tres preguntas distintas sobre el alumno y una edición (no confundirlas):
--   alumno_activo_en(e)   no es desertor            → encuestas, horarios
--   alumno_con_acceso(e)  cursa, o finalizó hace ≤ 3 meses → material y estructura
--   alumno_cursando(e)    inscripción activa        → próxima clase

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 1. Fecha de finalización y vencimiento del acceso
-- ════════════════════════════════════════════════════════════════════════════════════════════
alter table inscripciones add column finalizado_el date;          -- día (Argentina) en que pasó a finalizado
-- El plazo vive solo acá: la base y la app leen esta columna. El día del vencimiento todavía tiene acceso.
alter table inscripciones add column acceso_hasta date
  generated always as ((finalizado_el + interval '3 months')::date) stored;

-- Igual que la versión de la 0011, más la fecha de finalización.
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

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 2. Quién accede al material
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Cursa la edición, o la finalizó y todavía está dentro del plazo.
create function alumno_con_acceso(p_edicion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from inscripciones i
                 where i.edicion_id = p_edicion and i.alumno_id = auth.uid() and auth_rol() = 'alumno'
                   and (i.estado = 'activo' or (i.estado = 'finalizado' and hoy_ar() <= i.acceso_hasta)))
$$;

-- Está cursando la edición (inscripción activa).
create function alumno_cursando(p_edicion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from inscripciones i
                 where i.edicion_id = p_edicion and i.alumno_id = auth.uid() and auth_rol() = 'alumno'
                   and i.estado = 'activo')
$$;

-- Material liberado en la edición: para el alumno con acceso (antes: cualquier no desertor).
create or replace function material_visible(p_edicion uuid)
returns table (id uuid, tipo tipo_material, titulo text, url text, plan_clase_id uuid, clase_numero int, clase_titulo text,
               clase_tipo tipo_clase, modulo_id uuid, modulo_titulo text, modulo_orden int)
language sql stable security definer set search_path = public as $$
  select x.id, x.tipo, x.titulo, case when x.tipo = 'link' then x.url end,
         pc.id, pc.numero, pc.titulo, pc.tipo, mo.id, mo.titulo, mo.orden
  from _materiales_efectivos(p_edicion) x
  left join plan_clases pc on pc.id = x.plan_clase_id
  left join modulos_curso mo on mo.id = pc.modulo_id
  where x.liberado and alumno_con_acceso(p_edicion)
  order by mo.orden nulls last, pc.numero nulls last, x.creado_en
$$;

-- Próxima clase: solo para quien está cursando (un curso finalizado no tiene «próxima clase»), su profesor o el admin.
create or replace function proxima_clase_titulo(p_edicion uuid)
returns table (numero int, fecha date, titulo text, tipo tipo_clase, modulo_titulo text, plan_clase_id uuid)
language sql stable security definer set search_path = public as $$
  select pc.numero, cl.fecha, pc.titulo, pc.tipo, mo.titulo, pc.id
  from clases cl
  join plan_clases pc on pc.id = cl.plan_clase_id
  left join modulos_curso mo on mo.id = pc.modulo_id
  where cl.edicion_id = p_edicion and cl.fecha >= hoy_ar() and cl.estado = 'programada'
    and (alumno_cursando(p_edicion) or es_profesor_de(p_edicion) or es_admin())
  order by cl.fecha limit 1
$$;

-- Temario del alumno en su edición (misma regla que la 0017), para el alumno con acceso.
create or replace function temario_alumno(p_edicion uuid)
returns table (modulo_id uuid, modulo_orden int, modulo_titulo text,
               plan_clase_id uuid, clase_numero int, clase_titulo text, clase_tipo tipo_clase, es_proxima boolean)
language sql stable security definer set search_path = public as $$
  with ok as (
    select alumno_con_acceso(p_edicion) as si
  ), prox as (
    select p.plan_clase_id from proxima_clase_titulo(p_edicion) p
  ), lib as (
    select x.plan_clase_id from _materiales_efectivos(p_edicion) x where x.liberado and x.plan_clase_id is not null
  ), vis as (
    select pc.id, pc.numero, pc.titulo, pc.tipo, pc.modulo_id, pc.id in (select plan_clase_id from prox) es_proxima
    from _clases_efectivas(p_edicion) pc
    where (select si from ok)
      and (pc.id in (select plan_clase_id from prox)
           or pc.id in (select plan_clase_id from lib)
           or exists (select 1 from clases cl where cl.edicion_id = p_edicion and cl.plan_clase_id = pc.id
                      and cl.estado not in ('suspendida', 'salteada') and cl.fecha <= hoy_ar()))
  )
  select * from (
    select m.id, m.orden, m.titulo, v.id, v.numero, v.titulo, v.tipo, coalesce(v.es_proxima, false)
    from _modulos_efectivos(p_edicion) m
    left join vis v on v.modulo_id = m.id
    where (select si from ok)
    union all
    select null, null, null, v.id, v.numero, v.titulo, v.tipo, v.es_proxima from vis v where v.modulo_id is null
  ) t
  order by 2 nulls last, 5 nulls first
$$;

-- Estructura efectiva de la edición: admin, su profesor, el alumno con acceso o service role.
create or replace function estructura_edicion(p_edicion uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (es_admin() or es_profesor_de(p_edicion) or alumno_con_acceso(p_edicion) or auth.role() = 'service_role') then
    raise exception 'No tenés acceso a este curso';
  end if;
  if not exists (select 1 from ediciones where id = p_edicion) then return null; end if;
  return jsonb_build_object(
    'personalizada', edicion_personalizada(p_edicion),
    'modulos', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'titulo', m.titulo, 'orden', m.orden) order by m.orden)
                         from _modulos_efectivos(p_edicion) m), '[]'),
    'clases', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'tipo', c.tipo,
                                                            'modulo_id', c.modulo_id) order by c.numero)
                        from _clases_efectivas(p_edicion) c), '[]'));
end $$;

revoke execute on function alumno_con_acceso(uuid) from public, anon;
revoke execute on function alumno_cursando(uuid) from public, anon;
revoke execute on function material_visible(uuid) from public, anon;
revoke execute on function proxima_clase_titulo(uuid) from public, anon;
revoke execute on function temario_alumno(uuid) from public, anon;
revoke execute on function estructura_edicion(uuid) from public, anon;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 3. Inscripciones que ya estaban finalizadas: no hay fecha guardada, el plazo corre desde hoy.
--    (Al final: no puede haber ALTER TABLE sobre la tabla después de este UPDATE en la misma transacción.)
-- ════════════════════════════════════════════════════════════════════════════════════════════
update inscripciones set finalizado_el = hoy_ar() where estado = 'finalizado';
