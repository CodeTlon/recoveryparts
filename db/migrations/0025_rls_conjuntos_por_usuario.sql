-- 0025 · RLS del profesor y del alumno: de «una función por fila» a «un conjunto por consulta».
-- Tras la 0024 el admin y el alumno quedaron en milisegundos, pero es_profesor_de(edicion_id) seguía llamándose por cada
-- fila (con 40.000 inscripciones, un profesor tardaba ~23 segundos). Estas funciones devuelven de una vez las ediciones
-- (o cursos) del usuario y las políticas comparan con IN: Postgres arma el conjunto una sola vez (hashed SubPlan).
-- Misma regla que los helpers de siempre (es_profesor_de, es_profesor_del_curso, alumno_activo_en, alumno_del_curso),
-- que se conservan porque las funciones SQL de negocio los usan.
create function mis_ediciones_profesor() returns setof uuid
language sql stable security definer set search_path = public as $$
  select e.id from ediciones e
  where e.profesor_id = auth.uid() and auth_rol() = 'profesor' and edicion_vigente(e.id)
$$;
create function mis_cursos_profesor() returns setof uuid
language sql stable security definer set search_path = public as $$
  select e.curso_id from ediciones e
  where e.profesor_id = auth.uid() and auth_rol() = 'profesor' and edicion_vigente(e.id)
$$;
create function mis_ediciones_alumno() returns setof uuid
language sql stable security definer set search_path = public as $$
  select i.edicion_id from inscripciones i
  where i.alumno_id = auth.uid() and i.estado <> 'desertor' and auth_rol() = 'alumno'
$$;
create function mis_cursos_alumno() returns setof uuid
language sql stable security definer set search_path = public as $$
  select e.curso_id from inscripciones i join ediciones e on e.id = i.edicion_id
  where i.alumno_id = auth.uid() and i.estado <> 'desertor' and auth_rol() = 'alumno'
$$;
revoke execute on function mis_ediciones_profesor(), mis_cursos_profesor(), mis_ediciones_alumno(), mis_cursos_alumno() from public, anon;
grant execute on function mis_ediciones_profesor(), mis_cursos_profesor(), mis_ediciones_alumno(), mis_cursos_alumno() to authenticated, service_role;

do $$
declare
  p record; q text; w text; reescritas int := 0;
  reglas constant text[][] := array[
    ['es_profesor_de', 'mis_ediciones_profesor'], ['es_profesor_del_curso', 'mis_cursos_profesor'],
    ['alumno_activo_en', 'mis_ediciones_alumno'], ['alumno_del_curso', 'mis_cursos_alumno']];
  r text[];
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    q := p.qual; w := p.with_check;
    foreach r slice 1 in array reglas loop
      if q is not null then q := regexp_replace(q, '(?<![\w])' || r[1] || '\(([^()]*)\)', '(\1 IN (SELECT ' || r[2] || '()))', 'g'); end if;
      if w is not null then w := regexp_replace(w, '(?<![\w])' || r[1] || '\(([^()]*)\)', '(\1 IN (SELECT ' || r[2] || '()))', 'g'); end if;
    end loop;
    if q is not distinct from p.qual and w is not distinct from p.with_check then continue; end if;
    execute format('alter policy %I on %I.%I%s%s', p.policyname, p.schemaname, p.tablename,
      case when q is not null then ' using (' || q || ')' else '' end,
      case when w is not null then ' with check (' || w || ')' else '' end);
    reescritas := reescritas + 1;
  end loop;
  raise notice 'Políticas reescritas: %', reescritas;
end $$;
