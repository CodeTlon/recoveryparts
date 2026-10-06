-- 0013 · Estructura del curso: módulos → clases → material (RF-26, RF-31, RF-37).
-- Un curso se arma con MÓDULOS que contienen CLASES (teóricas o prácticas), y cada clase tiene su MATERIAL.
-- Los talleres no llevan módulos: solo una lista de clases.
-- El calendario de cada edición y el material pasan a apuntar a la CLASE (plan_clases.id), no a su número:
-- si una clase cambia de lugar, su material y sus fechas van con ella.
--
-- Esta migración AGREGA lo nuevo sin borrar lo viejo (clases.numero, materiales.clase_numero, modulos_curso.items):
-- mientras conviven, un trigger mantiene sincronizados número e id. La 0014 borra lo viejo y activa la regla
-- de estructura como constraint trigger.

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 1. Módulos y clases del plan
-- ════════════════════════════════════════════════════════════════════════════════════════════
create type tipo_clase as enum ('teorica', 'practica');

alter table modulos_curso add constraint modulos_curso_titulo_check check (length(btrim(titulo)) between 1 and 120);
alter table modulos_curso add constraint modulos_curso_curso_id_orden_key unique (curso_id, orden) deferrable initially deferred;

alter table plan_clases
  add column modulo_id uuid references modulos_curso(id) on delete restrict,
  add column tipo tipo_clase not null default 'teorica';
create index on plan_clases (modulo_id);
-- Renumerar el plan en una sola transacción necesita el unique diferido (no sirve como arbiter de ON CONFLICT).
alter table plan_clases drop constraint plan_clases_curso_id_numero_key,
  add constraint plan_clases_curso_id_numero_key unique (curso_id, numero) deferrable initially deferred;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 2. Material y calendario apuntan a la clase (P5: el material sigue a la clase, no a su posición)
-- ════════════════════════════════════════════════════════════════════════════════════════════
alter table materiales add column plan_clase_id uuid references plan_clases(id) on delete set null;  -- clase borrada → material general
update materiales m set plan_clase_id = pc.id
from plan_clases pc where pc.curso_id = m.curso_id and pc.numero = m.clase_numero;
create index on materiales (plan_clase_id);

alter table clases add column plan_clase_id uuid references plan_clases(id) on delete restrict;      -- no se borra una clase con fechas
-- Con datos, el relleno dispara el trigger diferido de período de la edición y Postgres no permite ALTER TABLE con
-- eventos pendientes: durante la migración esos triggers corren en el momento.
set constraints all immediate;
update clases cl set plan_clase_id = pc.id
from ediciones e join plan_clases pc on pc.curso_id = e.curso_id
where e.id = cl.edicion_id and pc.numero = cl.numero;
alter table clases alter column numero drop not null;
-- La clase (no su número) es única en el calendario de la edición; el número sale del plan.
alter table clases drop constraint clases_edicion_id_numero_key;
alter table clases add constraint clases_edicion_id_plan_clase_id_key unique (edicion_id, plan_clase_id);

-- Calendario: la clase es del plan del curso de la edición y no es anterior al inicio.
-- Mientras conviven número e id, se completa el que falte.
create or replace function clases_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record; v_pc record;
begin
  select ed.fecha_inicio, ed.curso_id into e from ediciones ed where ed.id = new.edicion_id;
  if new.plan_clase_id is not null then
    select id, numero into v_pc from plan_clases where id = new.plan_clase_id and curso_id = e.curso_id;
  else
    select id, numero into v_pc from plan_clases where numero = new.numero and curso_id = e.curso_id;
  end if;
  if v_pc.id is null then
    raise exception 'La clase no está en el plan de clases del curso.';
  end if;
  new.plan_clase_id := v_pc.id;
  new.numero := v_pc.numero;
  if e.fecha_inicio is not null and new.fecha < e.fecha_inicio then
    raise exception 'La clase % (%) es anterior al inicio de la edición (%).',
      v_pc.numero, to_char(new.fecha, 'DD/MM/YYYY'), to_char(e.fecha_inicio, 'DD/MM/YYYY');
  end if;
  return new;
end $$;

-- Material: no cambia de archivo ni de curso; su clase es del mismo curso. Se completa número ↔ id.
create or replace function materiales_integridad() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.storage_path is distinct from old.storage_path or new.curso_id <> old.curso_id) then
    raise exception 'No se puede cambiar el archivo ni el curso de un material';
  end if;
  if new.plan_clase_id is not null then
    select numero into new.clase_numero from plan_clases where id = new.plan_clase_id and curso_id = new.curso_id;
    if not found then raise exception 'La clase no es de este curso'; end if;
  elsif new.clase_numero is not null and (tg_op = 'INSERT' or new.clase_numero is distinct from old.clase_numero) then
    select id into new.plan_clase_id from plan_clases where numero = new.clase_numero and curso_id = new.curso_id;
    if not found then raise exception 'La clase no es de este curso'; end if;
  else
    new.clase_numero := null;
  end if;
  return new;
end $$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 3. Regla de estructura (se activa como constraint trigger en la 0014)
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Curso: toda clase tiene módulo, todo módulo tiene clases, y las clases de un módulo van juntas en el orden
-- de los módulos. Taller: sin módulos. Un curso vacío (recién creado) es válido.
create function validar_estructura(p_curso uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_tipo text; v_txt text;
begin
  select tipo::text into v_tipo from cursos where id = p_curso;
  if v_tipo is null then return; end if;
  if v_tipo = 'taller' then
    if exists (select 1 from modulos_curso where curso_id = p_curso) then
      raise exception 'Un taller no lleva módulos: cargá sus clases sin módulo.';
    end if;
    return;
  end if;
  select titulo into v_txt from plan_clases where curso_id = p_curso and modulo_id is null order by numero limit 1;
  if found then raise exception 'La clase «%» no tiene módulo.', v_txt; end if;
  select m.titulo into v_txt from modulos_curso m
  where m.curso_id = p_curso and not exists (select 1 from plan_clases pc where pc.modulo_id = m.id) order by m.orden limit 1;
  if found then raise exception 'El módulo «%» no tiene clases.', v_txt; end if;
  if exists (select 1 from plan_clases a join modulos_curso ma on ma.id = a.modulo_id,
                           plan_clases b join modulos_curso mb on mb.id = b.modulo_id
             where a.curso_id = p_curso and b.curso_id = p_curso and a.numero < b.numero and ma.orden > mb.orden) then
    raise exception 'Las clases de cada módulo tienen que ir juntas y en el orden de los módulos.';
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 4. Guardar la estructura completa de una vez (admin o profesor de una edición activa del curso; RF-31)
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- p_modulos: [{id?, titulo}] en orden. p_clases: [{id?, titulo, tipo, modulo}] en orden; `modulo` es el índice
-- en p_modulos (null en talleres). Upsert por id: los ids de las clases se conservan y su material y sus fechas
-- las siguen. Lo que no viene se borra: el material de una clase borrada queda general; una clase con fechas en
-- algún calendario no se puede borrar.
-- Security definer con chequeo explícito de rol: renumerar sincroniza el calendario de TODAS las ediciones.
create function guardar_estructura(p_curso uuid, p_modulos jsonb, p_clases jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[] := '{}'; v_cls uuid[] := '{}';
  v_id uuid; v_mod uuid; r record; v_txt text;
begin
  if not (es_admin() or es_profesor_del_curso(p_curso)) then
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
  delete from plan_clases where curso_id = p_curso and id <> all (v_cls);
  delete from modulos_curso where curso_id = p_curso and id <> all (v_ids);

  -- Mientras convivan las columnas viejas (hasta la 0014), el número sigue a la clase.
  update clases cl set numero = pc.numero from plan_clases pc
  where pc.id = cl.plan_clase_id and pc.curso_id = p_curso and cl.numero is distinct from pc.numero;
  update materiales m set clase_numero = pc.numero from plan_clases pc
  where pc.id = m.plan_clase_id and pc.curso_id = p_curso and m.clase_numero is distinct from pc.numero;

  perform validar_estructura(p_curso);
end $$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 5. Lo que ve el alumno (RF-32, RF-37)
-- ════════════════════════════════════════════════════════════════════════════════════════════
drop function if exists material_visible(uuid);
drop function if exists proxima_clase_titulo(uuid);

-- Material visible en SU edición: liberado a mano en esa edición, o su clase ya llegó en el calendario
-- (las suspendidas y salteadas no liberan solas).
create function material_visible(p_edicion uuid)
returns table (id uuid, tipo tipo_material, titulo text, url text, plan_clase_id uuid, clase_numero int, clase_titulo text,
               clase_tipo tipo_clase, modulo_id uuid, modulo_titulo text, modulo_orden int)
language sql stable security definer set search_path = public as $$
  select m.id, m.tipo, m.titulo, case when m.tipo = 'link' then m.url end,
         pc.id, pc.numero, pc.titulo, pc.tipo, mo.id, mo.titulo, mo.orden
  from ediciones e
  join materiales m on m.curso_id = e.curso_id
  left join plan_clases pc on pc.id = m.plan_clase_id
  left join modulos_curso mo on mo.id = pc.modulo_id
  where e.id = p_edicion and alumno_activo_en(p_edicion)
    and (exists (select 1 from materiales_liberados ml where ml.edicion_id = e.id and ml.material_id = m.id)
         or exists (select 1 from clases cl where cl.edicion_id = e.id and cl.plan_clase_id = m.plan_clase_id
                    and cl.estado not in ('suspendida', 'salteada') and cl.fecha <= hoy_ar()))
  order by mo.orden nulls last, pc.numero nulls last, m.creado_en
$$;

-- Próxima clase por FECHA (si el profesor adelantó una, esa es la próxima). Solo título y tipo, nunca material.
create function proxima_clase_titulo(p_edicion uuid)
returns table (numero int, fecha date, titulo text, tipo tipo_clase, modulo_titulo text, plan_clase_id uuid)
language sql stable security definer set search_path = public as $$
  select pc.numero, cl.fecha, pc.titulo, pc.tipo, mo.titulo, pc.id
  from clases cl
  join plan_clases pc on pc.id = cl.plan_clase_id
  left join modulos_curso mo on mo.id = pc.modulo_id
  where cl.edicion_id = p_edicion and cl.fecha >= hoy_ar() and cl.estado = 'programada'
    and (alumno_activo_en(p_edicion) or es_profesor_de(p_edicion) or es_admin())
  order by cl.fecha limit 1
$$;

-- Temario del alumno en su edición: TODOS los módulos (solo título) y, dentro, solo las clases ya dictadas,
-- las que tienen material liberado a mano y la próxima. Nunca clases futuras. Talleres: clases sin módulo.
create function temario_alumno(p_edicion uuid)
returns table (modulo_id uuid, modulo_orden int, modulo_titulo text,
               plan_clase_id uuid, clase_numero int, clase_titulo text, clase_tipo tipo_clase, es_proxima boolean)
language sql stable security definer set search_path = public as $$
  with e as (
    select id, curso_id from ediciones where id = p_edicion and alumno_activo_en(p_edicion)
  ), prox as (
    select p.plan_clase_id from proxima_clase_titulo(p_edicion) p
  ), vis as (
    select pc.id, pc.numero, pc.titulo, pc.tipo, pc.modulo_id, pc.id in (select plan_clase_id from prox) es_proxima
    from plan_clases pc join e on e.curso_id = pc.curso_id
    where pc.id in (select plan_clase_id from prox)
       or exists (select 1 from clases cl where cl.edicion_id = e.id and cl.plan_clase_id = pc.id
                  and cl.estado not in ('suspendida', 'salteada') and cl.fecha <= hoy_ar())
       or exists (select 1 from materiales m join materiales_liberados ml on ml.material_id = m.id and ml.edicion_id = e.id
                  where m.plan_clase_id = pc.id)
  )
  select * from (
    select m.id, m.orden, m.titulo, v.id, v.numero, v.titulo, v.tipo, coalesce(v.es_proxima, false)
    from modulos_curso m join e on e.curso_id = m.curso_id
    left join vis v on v.modulo_id = m.id
    union all
    select null, null, null, v.id, v.numero, v.titulo, v.tipo, v.es_proxima from vis v where v.modulo_id is null
  ) t
  order by 2 nulls last, 5 nulls first
$$;

revoke execute on function material_visible(uuid) from public, anon;
revoke execute on function proxima_clase_titulo(uuid) from public, anon;
revoke execute on function temario_alumno(uuid) from public, anon;
revoke execute on function guardar_estructura(uuid, jsonb, jsonb) from public, anon;
revoke execute on function validar_estructura(uuid) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 6. RLS y auditoría
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- P4: el profesor de una edición activa del curso edita los módulos (igual que el plan de clases).
create policy modulos_profesor on modulos_curso for all
  using (es_profesor_del_curso(curso_id)) with check (es_profesor_del_curso(curso_id)); -- RF-31

create trigger audit_modulos_curso after insert or update or delete on modulos_curso
  for each row execute function audit_trigger();
create trigger audit_plan_clases after insert or update or delete on plan_clases
  for each row execute function audit_trigger();
