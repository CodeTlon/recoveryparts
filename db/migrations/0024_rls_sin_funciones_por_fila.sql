-- 0024 · Las políticas RLS evaluaban es_admin() / auth_rol() / auth.uid() UNA VEZ POR FILA.
-- Son funciones SECURITY DEFINER (no se pueden inlinear) que consultan `profiles`: con 40.000 inscripciones un
-- count(*) del admin tardaba ~10 segundos. Envueltas en (select …) Postgres las evalúa una sola vez por consulta
-- (InitPlan), porque no dependen de la fila.
-- Los helpers que sí dependen de la fila (es_profesor_de(edicion_id), alumno_*) llevan antes la comprobación de rol:
-- cada uno ya exige ese rol por dentro, así que el resultado es idéntico, pero ahora un admin o un alumno no pagan
-- la función en las filas que no le corresponden (AND corta en la primera condición falsa).
-- Reescribe las políticas que existan, sin repetir sus definiciones (viven repartidas en las migraciones 0003-0018).
do $$
declare
  p record;
  q text; w text;
  -- helper → rol que ya exige por dentro
  helpers constant text[][] := array[
    ['es_profesor_de', 'profesor'], ['es_profesor_del_curso', 'profesor'],
    ['alumno_activo_en', 'alumno'], ['alumno_del_curso', 'alumno'],
    ['alumno_con_acceso', 'alumno'], ['alumno_cursando', 'alumno']];
  h text[];
  reescritas int := 0;
  function_txt text;
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    q := p.qual; w := p.with_check;
    foreach h slice 1 in array helpers loop
      -- marcador (se sustituye al final) para no envolver dos veces el auth_rol() que se agrega
      if q is not null then q := regexp_replace(q, '(?<![\w])' || h[1] || '\(([^()]*)\)', '(@@ROL:' || h[2] || '@@ AND ' || h[1] || '(\1))', 'g'); end if;
      if w is not null then w := regexp_replace(w, '(?<![\w])' || h[1] || '\(([^()]*)\)', '(@@ROL:' || h[2] || '@@ AND ' || h[1] || '(\1))', 'g'); end if;
    end loop;
    foreach function_txt in array array['es_admin()', 'auth_rol()', 'auth.uid()'] loop
      if q is not null then q := replace(q, function_txt, '(select ' || function_txt || ')'); end if;
      if w is not null then w := replace(w, function_txt, '(select ' || function_txt || ')'); end if;
    end loop;
    if q is not null then q := regexp_replace(q, '@@ROL:(\w+)@@', '(select auth_rol()) = ''\1''::rol_usuario', 'g'); end if;
    if w is not null then w := regexp_replace(w, '@@ROL:(\w+)@@', '(select auth_rol()) = ''\1''::rol_usuario', 'g'); end if;
    -- ya envuelta por una corrida anterior (pg_get_expr devuelve «( SELECT es_admin() AS es_admin)»): no tocar
    if q is not distinct from p.qual and w is not distinct from p.with_check then continue; end if;
    if (coalesce(p.qual, '') || coalesce(p.with_check, '')) ~* 'select (es_admin|auth_rol|auth\.uid)\(\)' then continue; end if;
    execute format('alter policy %I on %I.%I%s%s', p.policyname, p.schemaname, p.tablename,
      case when q is not null then ' using (' || q || ')' else '' end,
      case when w is not null then ' with check (' || w || ')' else '' end);
    reescritas := reescritas + 1;
  end loop;
  raise notice 'Políticas reescritas: %', reescritas;
end $$;
