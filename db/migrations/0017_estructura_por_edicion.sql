-- 0017 · Estructura por edición, material base y vigencia de la edición (RF-04, RF-31, RF-32, RF-58).
-- La GUÍA GENERAL del curso (módulos y clases con edicion_id null) la define el admin y es con lo que arranca cada
-- edición. El profesor puede adaptar SU edición: la primera vez que la guarda se copia la guía a la edición
-- (filas con edicion_id = la edición; cada clase copiada recuerda su clase de origen) y desde ahí la edición tiene
-- su propia estructura, que no toca la guía ni a las otras ediciones. «Volver a la guía general» borra la copia.
-- El material se separa igual: edicion_id null = material BASE (lo carga el admin, se ve en todas las ediciones
-- que conservan su clase); edicion_id = la edición = material que el profesor subió para su edición.
-- Una edición terminada (su última clase ya pasó) o dada de baja deja de ser accesible para el profesor.

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 1. Columnas y unicidad por ámbito (guía o edición)
-- ════════════════════════════════════════════════════════════════════════════════════════════
alter table modulos_curso add column edicion_id uuid references ediciones(id) on delete cascade;
alter table plan_clases
  add column edicion_id uuid references ediciones(id) on delete cascade,
  add column origen_id uuid references plan_clases(id) on delete set null;   -- clase de la guía de la que se copió
alter table materiales add column edicion_id uuid references ediciones(id) on delete cascade;  -- null = material base
create index on modulos_curso (edicion_id);
create index on plan_clases (edicion_id);
create index on plan_clases (origen_id);
create index on materiales (edicion_id);

-- Una sola copia por clase de origen en cada edición.
alter table plan_clases add constraint plan_clases_edicion_id_origen_id_key unique (edicion_id, origen_id);
-- Orden de módulos y número de clase únicos dentro de cada ámbito (la guía es edicion_id null).
alter table modulos_curso drop constraint modulos_curso_curso_id_orden_key,
  add constraint modulos_curso_ambito_orden_key unique nulls not distinct (curso_id, edicion_id, orden) deferrable initially deferred;
alter table plan_clases drop constraint plan_clases_curso_id_numero_key,
  add constraint plan_clases_ambito_numero_key unique nulls not distinct (curso_id, edicion_id, numero) deferrable initially deferred;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 2. Vigencia de la edición (RF-04). Misma regla que momentoEdicion() en src/lib/fechas.ts.
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Fin = última fecha del calendario (o el inicio si no hay clases).
create function fin_edicion(p_edicion uuid) returns date
language sql stable security definer set search_path = public as $$
  select greatest(e.fecha_inicio, (select max(c.fecha) from clases c where c.edicion_id = e.id))
  from ediciones e where e.id = p_edicion
$$;

-- En curso o próxima: activa y su fin no pasó.
create function edicion_vigente(p_edicion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select e.activo and coalesce(fin_edicion(e.id) >= hoy_ar(), true) from ediciones e where e.id = p_edicion), false)
$$;

-- El profesor solo accede a sus ediciones VIGENTES: una terminada o dada de baja desaparece para él
-- (alumnos, calendario, material, liberación y estructura).
create or replace function es_profesor_de(p_edicion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from ediciones e
                 where e.id = p_edicion and e.profesor_id = auth.uid() and auth_rol() = 'profesor')
     and edicion_vigente(p_edicion)
$$;

-- Profesor de alguna edición vigente del curso: puede leer el curso y su guía general.
create or replace function es_profesor_del_curso(p_curso uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from ediciones e
                 where e.curso_id = p_curso and e.profesor_id = auth.uid() and auth_rol() = 'profesor'
                   and edicion_vigente(e.id))
$$;

drop policy ediciones_profesor on ediciones;
create policy ediciones_profesor on ediciones for select
  using (profesor_id = auth.uid() and auth_rol() = 'profesor' and edicion_vigente(id));

drop policy profiles_profesor_alumnos on profiles;
create policy profiles_profesor_alumnos on profiles for select using (
  auth_rol() = 'profesor' and exists (
    select 1 from inscripciones i where i.alumno_id = profiles.id and es_profesor_de(i.edicion_id)
  )
);

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 3. Estructura efectiva de una edición
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Personalizada = tiene clases propias (se deriva de las filas: no hay un indicador que se pueda desincronizar).
create function edicion_personalizada(p_edicion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from plan_clases where edicion_id = p_edicion)
$$;

-- Módulos y clases que valen en la edición: los propios si está personalizada; si no, los de la guía.
-- Internas (sin chequeo de acceso): las usan las funciones de abajo, que sí lo chequean.
create function _clases_efectivas(p_edicion uuid) returns setof plan_clases
language sql stable security definer set search_path = public as $$
  select pc.* from plan_clases pc join ediciones e on e.id = p_edicion and e.curso_id = pc.curso_id
  where pc.edicion_id is not distinct from (case when edicion_personalizada(p_edicion) then p_edicion end)
$$;
create function _modulos_efectivos(p_edicion uuid) returns setof modulos_curso
language sql stable security definer set search_path = public as $$
  select m.* from modulos_curso m join ediciones e on e.id = p_edicion and e.curso_id = m.curso_id
  where m.edicion_id is not distinct from (case when edicion_personalizada(p_edicion) then p_edicion end)
$$;

-- Material de la edición: el base del curso y el que se subió para ESTA edición (nunca el de otras).
-- plan_clase_id es la clase efectiva: en una edición personalizada, el material base va a la copia de su clase;
-- si se borró esa clase en la edición, el material base no se muestra en ella.
create function _materiales_efectivos(p_edicion uuid)
returns table (id uuid, tipo tipo_material, titulo text, url text, plan_clase_id uuid, base boolean, propio boolean,
               liberado boolean, creado_en timestamptz)
language sql stable security definer set search_path = public as $$
  select x.id, x.tipo, x.titulo, x.url, x.efectiva, x.base, x.propio, x.liberado, x.creado_en
  from (
    select m.id, m.tipo, m.titulo, m.url, m.creado_en, m.plan_clase_id,
           m.edicion_id is null as base,
           (m.edicion_id is not null and m.subido_por = auth.uid()) as propio,
           exists (select 1 from materiales_liberados ml where ml.edicion_id = p_edicion and ml.material_id = m.id) as liberado,
           case when m.edicion_id is null and m.plan_clase_id is not null and edicion_personalizada(p_edicion)
                then (select c.id from plan_clases c where c.edicion_id = p_edicion and c.origen_id = m.plan_clase_id)
                else m.plan_clase_id end as efectiva
    from materiales m join ediciones e on e.id = p_edicion and e.curso_id = m.curso_id
    where m.edicion_id is null or m.edicion_id = p_edicion
  ) x
  where not (x.base and x.plan_clase_id is not null and x.efectiva is null)
  order by x.creado_en
$$;

-- Estructura efectiva de la edición. Admin, profesor de la edición, alumno activo en ella o service role.
create function estructura_edicion(p_edicion uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (es_admin() or es_profesor_de(p_edicion) or alumno_activo_en(p_edicion) or auth.role() = 'service_role') then
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

-- Material de la edición para el profesor o el admin.
create function materiales_edicion(p_edicion uuid)
returns table (id uuid, tipo tipo_material, titulo text, url text, plan_clase_id uuid, base boolean, propio boolean,
               liberado boolean, creado_en timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (es_admin() or es_profesor_de(p_edicion) or auth.role() = 'service_role') then
    raise exception 'No tenés acceso a este curso';
  end if;
  return query select * from _materiales_efectivos(p_edicion);
end $$;

-- Regla de estructura (RF-58) dentro de un ámbito: la guía (p_edicion null) o la estructura propia de una edición.
create function validar_estructura(p_curso uuid, p_edicion uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_tipo text; v_txt text; v_ed_curso uuid;
begin
  select tipo::text into v_tipo from cursos where id = p_curso;
  if v_tipo is null then return; end if;
  if p_edicion is not null then
    select curso_id into v_ed_curso from ediciones where id = p_edicion;
    if v_ed_curso is null then return; end if;              -- edición borrada: sus filas se van en cascada
    if v_ed_curso <> p_curso then raise exception 'Estructura inválida'; end if;
  end if;
  -- Un módulo y sus clases son del mismo ámbito.
  if exists (select 1 from plan_clases pc join modulos_curso m on m.id = pc.modulo_id
             where pc.curso_id = p_curso and pc.edicion_id is not distinct from p_edicion
               and (m.edicion_id is distinct from pc.edicion_id or m.curso_id <> pc.curso_id)) then
    raise exception 'Estructura inválida';
  end if;
  if v_tipo = 'taller' then
    if exists (select 1 from modulos_curso where curso_id = p_curso and edicion_id is not distinct from p_edicion) then
      raise exception 'Un taller no lleva módulos: cargá sus clases sin módulo.';
    end if;
    return;
  end if;
  select titulo into v_txt from plan_clases
  where curso_id = p_curso and edicion_id is not distinct from p_edicion and modulo_id is null order by numero limit 1;
  if found then raise exception 'La clase «%» no tiene módulo.', v_txt; end if;
  select m.titulo into v_txt from modulos_curso m
  where m.curso_id = p_curso and m.edicion_id is not distinct from p_edicion
    and not exists (select 1 from plan_clases pc where pc.modulo_id = m.id) order by m.orden limit 1;
  if found then raise exception 'El módulo «%» no tiene clases.', v_txt; end if;
  if exists (select 1 from plan_clases a join modulos_curso ma on ma.id = a.modulo_id,
                           plan_clases b join modulos_curso mb on mb.id = b.modulo_id
             where a.curso_id = p_curso and b.curso_id = p_curso
               and a.edicion_id is not distinct from p_edicion and b.edicion_id is not distinct from p_edicion
               and a.numero < b.numero and ma.orden > mb.orden) then
    raise exception 'Las clases de cada módulo tienen que ir juntas y en el orden de los módulos.';
  end if;
end $$;

create or replace function estructura_validar_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if tg_table_name = 'cursos' then
    -- Cambió el tipo del curso: se revalidan la guía y cada edición personalizada.
    for r in select distinct edicion_id from (select edicion_id from plan_clases where curso_id = new.id
                                              union select edicion_id from modulos_curso where curso_id = new.id) t loop
      perform validar_estructura(new.id, r.edicion_id);
    end loop;
    perform validar_estructura(new.id, null);
  elsif tg_op = 'DELETE' then
    perform validar_estructura(old.curso_id, old.edicion_id);
  else
    perform validar_estructura(new.curso_id, new.edicion_id);
    if tg_op = 'UPDATE' and (new.curso_id is distinct from old.curso_id or new.edicion_id is distinct from old.edicion_id) then
      perform validar_estructura(old.curso_id, old.edicion_id);
    end if;
  end if;
  return null;
end $$;
drop function validar_estructura(uuid);

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 4. Ficha pública: solo los módulos de la guía general (RF-26)
-- ════════════════════════════════════════════════════════════════════════════════════════════
create or replace view modulos_publicos with (security_invoker = false) as
select m.id, m.curso_id, m.orden, m.titulo
from modulos_curso m join cursos c on c.id = m.curso_id
where c.activo and c.tipo = 'curso' and m.edicion_id is null;

revoke execute on function fin_edicion(uuid) from public, anon;
revoke execute on function edicion_vigente(uuid) from public, anon;
revoke execute on function edicion_personalizada(uuid) from public, anon;
revoke execute on function estructura_edicion(uuid) from public, anon;
revoke execute on function materiales_edicion(uuid) from public, anon;
revoke execute on function validar_estructura(uuid, uuid) from public, anon, authenticated;
revoke execute on function _clases_efectivas(uuid) from public, anon, authenticated;
revoke execute on function _modulos_efectivos(uuid) from public, anon, authenticated;
revoke execute on function _materiales_efectivos(uuid) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 5. Guardar la guía y la estructura de una edición; volver a la guía (RF-31, RF-58)
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Guarda módulos y clases de UN ámbito (guía: p_edicion null; o la estructura propia de una edición).
-- p_modulos: [{id?, titulo}] en orden. p_clases: [{id?, titulo, tipo, modulo}] en orden; `modulo` es el índice en
-- p_modulos (null en talleres). Upsert por id (el material y las fechas siguen a su clase); lo que no viene se borra:
-- el material de una clase borrada queda general y una clase con fechas en un calendario no se puede borrar.
-- La regla de estructura la valida el constraint trigger al final de la transacción. Interna: sin chequeo de rol.
create function _guardar_estructura(p_curso uuid, p_edicion uuid, p_modulos jsonb, p_clases jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[] := '{}'; v_cls uuid[] := '{}';
  v_id uuid; v_mod uuid; r record; v_txt text;
begin
  if jsonb_typeof(p_modulos) <> 'array' or jsonb_typeof(p_clases) <> 'array' then
    raise exception 'Estructura inválida';
  end if;
  if jsonb_array_length(p_clases) > 500 then raise exception 'El plan admite hasta 500 clases.'; end if;

  for r in select value v, ordinality - 1 i from jsonb_array_elements(p_modulos) with ordinality loop
    v_id := nullif(r.v ->> 'id', '')::uuid;
    if v_id is not null then
      update modulos_curso set titulo = btrim(r.v ->> 'titulo'), orden = r.i
      where id = v_id and curso_id = p_curso and edicion_id is not distinct from p_edicion;
      if not found then raise exception 'Estructura inválida'; end if;
    else
      insert into modulos_curso (curso_id, edicion_id, orden, titulo)
      values (p_curso, p_edicion, r.i, btrim(r.v ->> 'titulo')) returning id into v_id;
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
      where id = v_id and curso_id = p_curso and edicion_id is not distinct from p_edicion;
      if not found then raise exception 'Estructura inválida'; end if;
    else
      insert into plan_clases (curso_id, edicion_id, numero, titulo, tipo, modulo_id)
      values (p_curso, p_edicion, r.i, btrim(r.v ->> 'titulo'), (r.v ->> 'tipo')::tipo_clase, v_mod) returning id into v_id;
    end if;
    v_cls := v_cls || v_id;
  end loop;

  select pc.titulo into v_txt from plan_clases pc
  where pc.curso_id = p_curso and pc.edicion_id is not distinct from p_edicion and pc.id <> all (v_cls)
    and exists (select 1 from clases cl where cl.plan_clase_id = pc.id) limit 1;
  if found then
    raise exception 'La clase «%» tiene fecha en el calendario. Sacala del calendario antes de borrarla.', v_txt;
  end if;
  delete from plan_clases where curso_id = p_curso and edicion_id is not distinct from p_edicion and id <> all (v_cls);
  delete from modulos_curso where curso_id = p_curso and edicion_id is not distinct from p_edicion and id <> all (v_ids);
end $$;

-- Guía general del curso: solo el admin (o service role para el seed). Las ediciones que no fueron personalizadas
-- la ven al instante; las personalizadas tienen su copia y no cambian.
create or replace function guardar_estructura(p_curso uuid, p_modulos jsonb, p_clases jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (es_admin() or auth.role() = 'service_role') then
    raise exception 'Solo la administración edita la guía general del curso';
  end if;
  perform _guardar_estructura(p_curso, null, p_modulos, p_clases);
end $$;

-- Estructura propia de una edición (admin o su profesor). La primera vez copia la guía a la edición (cada clase
-- recuerda su origen), lleva a las copias el calendario y el material propio de la edición, traduce los ids de la
-- guía que trae el editor a sus copias y recién ahí guarda.
create function guardar_estructura_edicion(p_edicion uuid, p_modulos jsonb, p_clases jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_curso uuid; v_map jsonb := '{}'; v_id uuid; r record;
begin
  if not (es_admin() or es_profesor_de(p_edicion) or auth.role() = 'service_role') then
    raise exception 'No tenés permiso para editar este curso';
  end if;
  select curso_id into v_curso from ediciones where id = p_edicion;
  if v_curso is null then raise exception 'Estructura inválida'; end if;
  if jsonb_typeof(p_modulos) <> 'array' or jsonb_typeof(p_clases) <> 'array' then raise exception 'Estructura inválida'; end if;
  if jsonb_array_length(p_clases) = 0 then raise exception 'El curso necesita al menos una clase.'; end if;

  if not edicion_personalizada(p_edicion) then
    for r in select id, orden, titulo from modulos_curso where curso_id = v_curso and edicion_id is null loop
      insert into modulos_curso (curso_id, edicion_id, orden, titulo) values (v_curso, p_edicion, r.orden, r.titulo) returning id into v_id;
      v_map := v_map || jsonb_build_object(r.id::text, v_id);
    end loop;
    for r in select id, numero, titulo, tipo, modulo_id from plan_clases where curso_id = v_curso and edicion_id is null loop
      insert into plan_clases (curso_id, edicion_id, numero, titulo, tipo, modulo_id, origen_id)
      values (v_curso, p_edicion, r.numero, r.titulo, r.tipo, (v_map ->> r.modulo_id::text)::uuid, r.id) returning id into v_id;
      v_map := v_map || jsonb_build_object(r.id::text, v_id);
    end loop;
    update clases set plan_clase_id = (v_map ->> plan_clase_id::text)::uuid where edicion_id = p_edicion;
    update materiales set plan_clase_id = (v_map ->> plan_clase_id::text)::uuid
    where edicion_id = p_edicion and plan_clase_id is not null;

    -- Los ids que trae el editor son de la guía: se traducen a sus copias.
    if exists (select 1 from jsonb_array_elements(p_modulos || p_clases) e
               where nullif(e ->> 'id', '') is not null and not v_map ? (e ->> 'id')) then
      raise exception 'Estructura inválida';
    end if;
    select coalesce(jsonb_agg(case when nullif(e ->> 'id', '') is null then e else jsonb_set(e, '{id}', v_map -> (e ->> 'id')) end order by o), '[]')
      into p_modulos from jsonb_array_elements(p_modulos) with ordinality t(e, o);
    select coalesce(jsonb_agg(case when nullif(e ->> 'id', '') is null then e else jsonb_set(e, '{id}', v_map -> (e ->> 'id')) end order by o), '[]')
      into p_clases from jsonb_array_elements(p_clases) with ordinality t(e, o);
  end if;

  perform _guardar_estructura(v_curso, p_edicion, p_modulos, p_clases);
end $$;

-- Volver a la guía general (admin o su profesor): el calendario y el material propio vuelven a la clase de origen;
-- lo que no tiene origen en la guía pierde su fecha (calendario) o queda como material general. Después se borra
-- la estructura propia y la edición vuelve a seguir la guía.
create function restablecer_estructura(p_edicion uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (es_admin() or es_profesor_de(p_edicion) or auth.role() = 'service_role') then
    raise exception 'No tenés permiso para editar este curso';
  end if;
  if not edicion_personalizada(p_edicion) then return; end if;
  -- Los triggers de calendario y material aceptan clases de la guía en esta edición solo durante esta operación.
  perform set_config('app.restablecer', p_edicion::text, true);

  delete from clases cl using plan_clases pc
  where cl.edicion_id = p_edicion and pc.id = cl.plan_clase_id
    and not exists (select 1 from plan_clases g where g.id = pc.origen_id and g.edicion_id is null);
  update clases cl set plan_clase_id = pc.origen_id from plan_clases pc
  where cl.edicion_id = p_edicion and pc.id = cl.plan_clase_id;

  update materiales m set plan_clase_id = (select g.id from plan_clases g where g.id = pc.origen_id and g.edicion_id is null)
  from plan_clases pc where m.edicion_id = p_edicion and pc.id = m.plan_clase_id;

  delete from plan_clases where edicion_id = p_edicion;
  delete from modulos_curso where edicion_id = p_edicion;
  perform set_config('app.restablecer', '', true);
end $$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 6. Integridad: calendario, material y liberación usan la estructura efectiva de la edición
-- ════════════════════════════════════════════════════════════════════════════════════════════
create or replace function clases_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record; v record;
begin
  select ed.fecha_inicio, ed.curso_id into e from ediciones ed where ed.id = new.edicion_id;
  select titulo, edicion_id into v from plan_clases where id = new.plan_clase_id and curso_id = e.curso_id;
  if v.titulo is null then
    raise exception 'La clase no es de este curso.';
  end if;
  if (v.edicion_id is null and edicion_personalizada(new.edicion_id)
      and coalesce(current_setting('app.restablecer', true), '') <> new.edicion_id::text)
     or (v.edicion_id is not null and v.edicion_id <> new.edicion_id) then
    raise exception 'La clase «%» no es de la estructura de este curso.', v.titulo;
  end if;
  if e.fecha_inicio is not null and new.fecha < e.fecha_inicio then
    raise exception 'La clase «%» (%) es anterior al inicio del curso (%).',
      v.titulo, to_char(new.fecha, 'DD/MM/YYYY'), to_char(e.fecha_inicio, 'DD/MM/YYYY');
  end if;
  return new;
end $$;

-- Material: no cambia de archivo, de curso ni de edición. El base va en una clase de la guía; el de una edición,
-- en una clase de la estructura efectiva de esa edición.
create or replace function materiales_integridad() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_ed uuid;
begin
  if tg_op = 'UPDATE' and (new.storage_path is distinct from old.storage_path or new.curso_id <> old.curso_id
                           or new.edicion_id is distinct from old.edicion_id) then
    raise exception 'No se puede cambiar el archivo, el curso ni la edición de un material';
  end if;
  if new.edicion_id is not null and not exists (select 1 from ediciones where id = new.edicion_id and curso_id = new.curso_id) then
    raise exception 'El material no es de este curso';
  end if;
  if new.plan_clase_id is not null then
    select edicion_id into v_ed from plan_clases where id = new.plan_clase_id and curso_id = new.curso_id;
    if not found then raise exception 'La clase no es de este curso'; end if;
    if new.edicion_id is null and v_ed is not null then
      raise exception 'El material base va en una clase de la guía general';
    end if;
    if new.edicion_id is not null
       and not (v_ed = new.edicion_id
                or (v_ed is null and (not edicion_personalizada(new.edicion_id)
                                      or coalesce(current_setting('app.restablecer', true), '') = new.edicion_id::text))) then
      raise exception 'La clase no es de la estructura de este curso';
    end if;
  end if;
  return new;
end $$;

-- Liberación: solo material base del curso o material de esa misma edición.
create or replace function materiales_liberados_integridad() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from materiales m join ediciones e on e.id = new.edicion_id and e.curso_id = m.curso_id
                 where m.id = new.material_id and (m.edicion_id is null or m.edicion_id = new.edicion_id)) then
    raise exception 'Ese material no es de este curso';
  end if;
  return new;
end $$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 7. RLS de la estructura: el profesor solo LEE (la guía de sus cursos y la estructura de sus ediciones);
--    escribe únicamente por guardar_estructura_edicion / restablecer_estructura.
-- ════════════════════════════════════════════════════════════════════════════════════════════
drop policy modulos_profesor on modulos_curso;
drop policy plan_profesor on plan_clases;
create policy modulos_profesor_select on modulos_curso for select
  using ((edicion_id is null and es_profesor_del_curso(curso_id)) or es_profesor_de(edicion_id));
create policy plan_profesor_select on plan_clases for select
  using ((edicion_id is null and es_profesor_del_curso(curso_id)) or es_profesor_de(edicion_id));

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 8. Lo que ve el alumno: la estructura y el material de SU edición (RF-32, RF-37)
-- ════════════════════════════════════════════════════════════════════════════════════════════
create or replace function material_visible(p_edicion uuid)
returns table (id uuid, tipo tipo_material, titulo text, url text, plan_clase_id uuid, clase_numero int, clase_titulo text,
               clase_tipo tipo_clase, modulo_id uuid, modulo_titulo text, modulo_orden int)
language sql stable security definer set search_path = public as $$
  select x.id, x.tipo, x.titulo, case when x.tipo = 'link' then x.url end,
         pc.id, pc.numero, pc.titulo, pc.tipo, mo.id, mo.titulo, mo.orden
  from _materiales_efectivos(p_edicion) x
  left join plan_clases pc on pc.id = x.plan_clase_id
  left join modulos_curso mo on mo.id = pc.modulo_id
  where x.liberado and alumno_activo_en(p_edicion)
  order by mo.orden nulls last, pc.numero nulls last, x.creado_en
$$;

-- Temario del alumno en su edición: todos los módulos (solo título) y, dentro, solo las clases ya dictadas, las que
-- tienen material liberado y la próxima. Nunca clases futuras. Talleres: clases sin módulo.
create or replace function temario_alumno(p_edicion uuid)
returns table (modulo_id uuid, modulo_orden int, modulo_titulo text,
               plan_clase_id uuid, clase_numero int, clase_titulo text, clase_tipo tipo_clase, es_proxima boolean)
language sql stable security definer set search_path = public as $$
  with ok as (
    select alumno_activo_en(p_edicion) as si
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

revoke execute on function _guardar_estructura(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function guardar_estructura(uuid, jsonb, jsonb) from public, anon;
revoke execute on function guardar_estructura_edicion(uuid, jsonb, jsonb) from public, anon;
revoke execute on function restablecer_estructura(uuid) from public, anon;
revoke execute on function material_visible(uuid) from public, anon;
revoke execute on function temario_alumno(uuid) from public, anon;
