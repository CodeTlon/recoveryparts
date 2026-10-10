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
-- Admin, profesor de la edición, alumno activo en ella o service role.
create function estructura_edicion(p_edicion uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_curso uuid; v_pers boolean; v_ambito uuid;
begin
  if not (es_admin() or es_profesor_de(p_edicion) or alumno_activo_en(p_edicion) or auth.role() = 'service_role') then
    raise exception 'No tenés acceso a este curso';
  end if;
  select curso_id into v_curso from ediciones where id = p_edicion;
  if v_curso is null then return null; end if;
  v_pers := edicion_personalizada(p_edicion);
  v_ambito := case when v_pers then p_edicion end;
  return jsonb_build_object(
    'personalizada', v_pers,
    'modulos', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'titulo', m.titulo, 'orden', m.orden) order by m.orden)
                         from modulos_curso m where m.curso_id = v_curso and m.edicion_id is not distinct from v_ambito), '[]'),
    'clases', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'tipo', c.tipo,
                                                            'modulo_id', c.modulo_id, 'origen_id', c.origen_id) order by c.numero)
                        from plan_clases c where c.curso_id = v_curso and c.edicion_id is not distinct from v_ambito), '[]'));
end $$;

-- Material de la edición: el base del curso y el que el profesor subió para ESTA edición (nunca el de otras).
-- plan_clase_id es la clase efectiva: en una edición personalizada, el material base va a la copia de su clase;
-- si el profesor borró esa clase, el material base no se muestra en su edición.
create function materiales_edicion(p_edicion uuid)
returns table (id uuid, tipo tipo_material, titulo text, url text, plan_clase_id uuid, base boolean, propio boolean,
               liberado boolean, creado_en timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_curso uuid; v_pers boolean;
begin
  if not (es_admin() or es_profesor_de(p_edicion) or auth.role() = 'service_role') then
    raise exception 'No tenés acceso a este curso';
  end if;
  select e.curso_id into v_curso from ediciones e where e.id = p_edicion;
  v_pers := edicion_personalizada(p_edicion);
  return query
  select x.id, x.tipo, x.titulo, x.url, x.efectiva, x.base, x.propio, x.liberado, x.creado_en
  from (
    select m.id, m.tipo, m.titulo, m.url, m.creado_en, m.plan_clase_id,
           m.edicion_id is null as base,
           (m.edicion_id is not null and m.subido_por = auth.uid()) as propio,
           exists (select 1 from materiales_liberados ml where ml.edicion_id = p_edicion and ml.material_id = m.id) as liberado,
           case when m.edicion_id is null and v_pers and m.plan_clase_id is not null
                then (select c.id from plan_clases c where c.edicion_id = p_edicion and c.origen_id = m.plan_clase_id)
                else m.plan_clase_id end as efectiva
    from materiales m
    where m.curso_id = v_curso and (m.edicion_id is null or m.edicion_id = p_edicion)
  ) x
  where not (x.base and v_pers and x.plan_clase_id is not null and x.efectiva is null)
  order by x.creado_en;
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
