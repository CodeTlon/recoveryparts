-- Pruebas de las reglas de negocio que viven en la base (triggers, funciones, RLS).
-- Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/db/reglas.sql
-- Corre todo dentro de una transacción que se revierte: no deja datos. Falla (exit != 0) si una regla no se cumple.
begin;

-- Datos: un profesor, tres alumnos, un taller de 3 clases con una edición de cupo 2.
insert into auth.users (email, raw_user_meta_data, invited_at, email_confirmed_at) values
  ('t-prof@test.local',  '{"rol":"profesor","nombre":"Prof","apellido":"Test"}', now(), now()),
  ('t-alu1@test.local',  '{"rol":"alumno","nombre":"Uno","apellido":"Test"}', now(), now()),
  ('t-alu2@test.local',  '{"rol":"alumno","nombre":"Dos","apellido":"Test"}', now(), now()),
  ('t-alu3@test.local',  '{"rol":"alumno","nombre":"Tres","apellido":"Test"}', now(), now()),
  ('t-prof2@test.local', '{"rol":"profesor","nombre":"Otro","apellido":"Profe"}', now(), now());

create temp table ctx as
  select (select id from profiles where email = 't-prof@test.local') as prof,
         (select id from profiles where email = 't-prof2@test.local') as prof2,
         (select id from profiles where email = 't-alu1@test.local') as a1,
         (select id from profiles where email = 't-alu2@test.local') as a2,
         (select id from profiles where email = 't-alu3@test.local') as a3,
         gen_random_uuid() as curso, gen_random_uuid() as edicion, gen_random_uuid() as encuesta;
grant select on ctx to public;

insert into cursos (id, slug, nombre, area, tipo) select curso, 'taller-de-prueba-reglas', 'Taller de prueba', 'tecnico', 'taller' from ctx;
insert into plan_clases (curso_id, numero, titulo) select curso, n, 'Clase ' || n from ctx, generate_series(1, 3) n;
insert into ediciones (id, curso_id, cupo, fecha_inicio, profesor_id)
  select edicion, curso, 2, hoy_ar() - 30, prof from ctx;
-- Clases: 1 hace 20 días, 2 hace 10 días y 3 dentro de 5 días (la edición sigue vigente: el profesor la ve).
insert into clases (edicion_id, plan_clase_id, fecha)
  select c.edicion, p.id, hoy_ar() + (case p.numero when 1 then -20 when 2 then -10 else 5 end)
  from ctx c join plan_clases p on p.curso_id = c.curso;

-- ── 1. Cupo exacto: el tercero no entra ──────────────────────────────────────────────────────
insert into inscripciones (alumno_id, edicion_id) select a1, edicion from ctx;
insert into inscripciones (alumno_id, edicion_id) select a2, edicion from ctx;
do $$ begin
  begin
    insert into inscripciones (alumno_id, edicion_id) select a3, edicion from ctx;
    raise exception 'FALLO: se inscribió un tercer alumno con cupo 2';
  exception when others then
    if sqlerrm not like '%cupos disponibles%' then raise; end if;
  end;
end $$;

-- ── 2. El desertor sigue ocupando cupo ───────────────────────────────────────────────────────
update inscripciones set estado = 'desertor', fecha_desercion = hoy_ar() - 5, motivo_desercion = 'Prueba'
  where alumno_id = (select a2 from ctx);
do $$ begin
  begin
    insert into inscripciones (alumno_id, edicion_id) select a3, edicion from ctx;
    raise exception 'FALLO: el desertor liberó su cupo';
  exception when others then
    if sqlerrm not like '%cupos disponibles%' then raise; end if;
  end;
end $$;

-- ── 3. N° de clase de la deserción (RF-55) lo calcula la base ────────────────────────────────
-- Desertó hace 5 días: ya se habían dictado las clases 1 y 2.
do $$ declare n int; begin
  select n_clase_desercion into n from inscripciones where alumno_id = (select a2 from ctx);
  if n is distinct from 2 then raise exception 'FALLO: n_clase_desercion esperado 2, fue %', n; end if;
end $$;
-- Una clase suspendida o salteada no cuenta: se suspende la 2 y el mismo desertor pasa a la clase 1.
update clases set estado = 'suspendida' where edicion_id = (select edicion from ctx)
  and plan_clase_id = (select p.id from plan_clases p, ctx where p.curso_id = ctx.curso and p.numero = 2);
do $$ declare n int; begin
  select n_clase_desercion into n from inscripciones where alumno_id = (select a2 from ctx);
  if n is distinct from 1 then raise exception 'FALLO: con la clase 2 suspendida se esperaba n_clase_desercion 1, fue %', n; end if;
end $$;

-- ── 4. Desertor y Finalizado son estados finales ─────────────────────────────────────────────
do $$ begin
  begin
    update inscripciones set estado = 'activo' where alumno_id = (select a2 from ctx);
    raise exception 'FALLO: un desertor volvió a activo';
  exception when others then if sqlerrm not like '%estado final%' then raise; end if; end;
end $$;
update inscripciones set estado = 'finalizado' where alumno_id = (select a1 from ctx);
do $$ begin
  begin
    update inscripciones set estado = 'desertor', fecha_desercion = hoy_ar(), motivo_desercion = 'x' where alumno_id = (select a1 from ctx);
    raise exception 'FALLO: un finalizado pasó a desertor';
  exception when others then if sqlerrm not like '%estado final%' then raise; end if; end;
  begin
    update inscripciones set estado = 'activo' where alumno_id = (select a1 from ctx);
    raise exception 'FALLO: un finalizado volvió a activo';
  exception when others then if sqlerrm not like '%estado final%' then raise; end if; end;
end $$;
do $$ begin
  if (select finalizado_el from inscripciones where alumno_id = (select a1 from ctx)) is distinct from hoy_ar()
  then raise exception 'FALLO: finalizado_el no se anotó'; end if;
end $$;

-- ── 5. La inscripción nunca se borra ─────────────────────────────────────────────────────────
do $$ begin
  begin
    delete from inscripciones where alumno_id = (select a2 from ctx);
    raise exception 'FALLO: se borró una inscripción';
  exception when others then if sqlerrm like 'FALLO%' then raise; end if; end;
end $$;

-- ── 6. Encuesta anónima: se guarda quién respondió, nunca qué respondió ──────────────────────
insert into encuestas (id, titulo, edicion_id, preguntas, activa)
  select encuesta, 'Encuesta de prueba', edicion, '[{"tipo":"puntaje","texto":"¿Cómo estuvo?"}]'::jsonb, true from ctx;
do $$ begin
  if exists (select 1 from information_schema.columns where table_name = 'encuesta_respuestas'
             and column_name in ('alumno_id', 'user_id', 'perfil_id'))
  then raise exception 'FALLO: encuesta_respuestas guarda la identidad del alumno'; end if;
end $$;
-- El alumno 1 (finalizado, no desertor) responde con su sesión.
select set_config('app.user_id', (select a1::text from ctx), true);
set local role authenticated;
select responder_encuesta((select encuesta from ctx), '{"0":"5"}'::jsonb);
do $$ begin
  begin
    perform responder_encuesta((select encuesta from ctx), '{"0":"4"}'::jsonb);
    raise exception 'FALLO: el alumno respondió dos veces';
  exception when unique_violation then null; end;
end $$;
reset role;
do $$ begin
  if (select count(*) from encuesta_completadas where encuesta_id = (select encuesta from ctx)) <> 1
     or (select count(*) from encuesta_respuestas where encuesta_id = (select encuesta from ctx)) <> 1
  then raise exception 'FALLO: la encuesta debería tener 1 completada y 1 respuesta'; end if;
end $$;
-- El desertor no puede responder.
select set_config('app.user_id', (select a2::text from ctx), true);
set local role authenticated;
do $$ begin
  begin
    perform responder_encuesta((select encuesta from ctx), '{"0":"3"}'::jsonb);
    raise exception 'FALLO: un desertor respondió la encuesta';
  exception when others then if sqlerrm like 'FALLO%' then raise; end if; end;
end $$;
reset role;

-- ── 7. RLS: cada alumno ve solo sus inscripciones ────────────────────────────────────────────
select set_config('app.user_id', (select a1::text from ctx), true);
set local role authenticated;
do $$ declare n int; begin
  select count(*) into n from inscripciones;
  if n <> 1 then raise exception 'FALLO: el alumno ve % inscripciones (esperaba 1: la suya)', n; end if;
  if (select count(*) from profiles) <> 1 then raise exception 'FALLO: el alumno ve perfiles ajenos'; end if;
end $$;
-- Un alumno no puede inscribirse a sí mismo ni a otro.
do $$ begin
  begin
    insert into inscripciones (alumno_id, edicion_id) select a3, edicion from ctx;
    raise exception 'FALLO: un alumno creó una inscripción';
  exception when others then if sqlerrm like 'FALLO%' then raise; end if; end;
end $$;
reset role;

-- El visitante anónimo no ve inscripciones, perfiles ni encuestas (RLS: 0 filas, o sin privilegio).
-- Como en la app: el visitante va con app.user_id vacío.
select set_config('app.user_id', '', true);
set local role anon;
do $$ declare t text; n int; begin
  foreach t in array array['inscripciones', 'profiles', 'encuestas', 'encuesta_respuestas', 'encuesta_completadas', 'audit_log'] loop
    begin
      execute format('select count(*) from %I', t) into n;
      if n <> 0 then raise exception 'FALLO: anon ve % filas de %', n, t; end if;
    exception when insufficient_privilege then null; end;
  end loop;
end $$;
reset role;

-- Un profesor ve las inscripciones y los alumnos de SUS ediciones; otro profesor, nada.
select set_config('app.user_id', (select prof::text from ctx), true);
set local role authenticated;
do $$ declare n int; begin
  select count(*) into n from inscripciones where edicion_id = (select edicion from ctx);
  if n <> 2 then raise exception 'FALLO: el profesor de la edición ve % inscripciones (esperaba 2)', n; end if;
  if not exists (select 1 from profiles where email = 't-alu1@test.local') then raise exception 'FALLO: el profesor no ve a su alumno'; end if;
  if exists (select 1 from profiles where email = 't-alu3@test.local') then raise exception 'FALLO: el profesor ve a un alumno de ninguna de sus ediciones'; end if;
end $$;
reset role;
select set_config('app.user_id', (select prof2::text from ctx), true);
set local role authenticated;
do $$ begin
  if exists (select 1 from inscripciones where edicion_id = (select edicion from ctx)) then raise exception 'FALLO: otro profesor ve inscripciones ajenas'; end if;
  if exists (select 1 from clases where edicion_id = (select edicion from ctx)) then raise exception 'FALLO: otro profesor ve clases ajenas'; end if;
  if exists (select 1 from profiles where email like 't-alu%@test.local') then raise exception 'FALLO: otro profesor ve alumnos ajenos'; end if;
end $$;
reset role;

-- El visitante anónimo puede ENVIAR los formularios públicos (insertar) pero no leerlos de vuelta.
select set_config('app.user_id', '', true);
set local role anon;
insert into contactos (nombre, email, mensaje) values ('Visitante', 'visitante@test.local', 'Hola');
insert into demanda_cursos (interes) values ('Curso de prueba');
do $$ begin
  begin
    perform 1 from contactos limit 1;
    raise exception 'FALLO: anon pudo leer contactos';
  exception when insufficient_privilege then null; end;
  -- INSERT ... RETURNING exige además poder leer la fila: por eso el constructor de consultas ya no lo agrega solo.
  begin
    execute 'insert into contactos (nombre, email, mensaje) values (''V'', ''v@test.local'', ''m'') returning id';
    raise exception 'FALLO: anon pudo insertar con RETURNING (leyó una fila)';
  exception when insufficient_privilege or others then if sqlerrm like 'FALLO%' then raise; end if; end;
end $$;
reset role;

-- ── 8. Calendario atómico (guardar_calendario) ───────────────────────────────────────────────
do $$ declare previas jsonb; p1 uuid; begin
  select p.id into p1 from plan_clases p, ctx where p.curso_id = ctx.curso and p.numero = 1;
  previas := guardar_calendario((select edicion from ctx),
    jsonb_build_array(jsonb_build_object('plan_clase_id', p1, 'fecha', hoy_ar() - 20, 'estado', 'programada')));
  if jsonb_array_length(previas) <> 3 then raise exception 'FALLO: debía devolver las 3 clases previas, devolvió %', jsonb_array_length(previas); end if;
  if (select count(*) from clases where edicion_id = (select edicion from ctx)) <> 1 then
    raise exception 'FALLO: debía quedar 1 clase tras reemplazar el calendario'; end if;
end $$;

-- Detección de calendario desactualizado: con la versión correcta guarda; con una vieja, no.
do $$ declare v text; p1 uuid; filas jsonb; begin
  select p.id into p1 from plan_clases p, ctx where p.curso_id = ctx.curso and p.numero = 1;
  filas := jsonb_build_array(jsonb_build_object('plan_clase_id', p1, 'fecha', hoy_ar() - 20, 'estado', 'programada'));
  v := calendario_version((select edicion from ctx));
  perform guardar_calendario((select edicion from ctx), filas, v);               -- versión vigente: guarda
  begin
    perform guardar_calendario((select edicion from ctx), filas, v);             -- ahora v quedó vieja si algo cambió...
  exception when others then null; end;
  -- Se cambia el calendario por otra vía y se intenta guardar con la versión anterior.
  update clases set fecha = hoy_ar() - 19 where edicion_id = (select edicion from ctx);
  begin
    perform guardar_calendario((select edicion from ctx), filas, v);
    raise exception 'FALLO: se guardó con un calendario desactualizado';
  exception when others then if sqlerrm like 'FALLO%' or sqlerrm not like '%cambió mientras lo editabas%' then raise; end if; end;
  -- Sin versión (clientes viejos) guarda igual.
  perform guardar_calendario((select edicion from ctx), filas);
end $$;

-- Horarios de una misma edición: no pueden pisarse el mismo día; los contiguos sí.
insert into horarios_curso (edicion_id, dia_semana, hora_inicio, hora_fin) select edicion, 1, '18:00', '20:00' from ctx;
insert into horarios_curso (edicion_id, dia_semana, hora_inicio, hora_fin) select edicion, 1, '20:00', '21:00' from ctx;   -- contiguo: ok
insert into horarios_curso (edicion_id, dia_semana, hora_inicio, hora_fin) select edicion, 2, '18:00', '20:00' from ctx;   -- otro día: ok
do $$ begin
  begin
    insert into horarios_curso (edicion_id, dia_semana, hora_inicio, hora_fin) select edicion, 1, '19:00', '21:00' from ctx;
    raise exception 'FALLO: se guardaron dos horarios superpuestos en la misma edición';
  exception when others then if sqlerrm not like '%horarios superpuestos%' then raise; end if; end;
end $$;

-- Aviso pendiente (RF-38): se marca al suspender/reprogramar, se conserva si no hay cambios y se limpia al volver a programada.
do $$ declare p1 uuid; e uuid; function_ok boolean; begin
  select ctx.edicion into e from ctx;
  select p.id into p1 from plan_clases p, ctx where p.curso_id = ctx.curso and p.numero = 1;
  perform guardar_calendario(e, jsonb_build_array(jsonb_build_object('plan_clase_id', p1, 'fecha', hoy_ar() - 20, 'estado', 'programada')));
  if (select aviso_pendiente from clases where edicion_id = e) then raise exception 'FALLO: una clase programada quedó con aviso pendiente'; end if;
  perform guardar_calendario(e, jsonb_build_array(jsonb_build_object('plan_clase_id', p1, 'fecha', hoy_ar() - 20, 'estado', 'suspendida')));
  if not (select aviso_pendiente from clases where edicion_id = e) then raise exception 'FALLO: al suspender no quedó el aviso pendiente'; end if;
  -- Guardar otra vez lo mismo no pierde la marca (el mail todavía no salió).
  perform guardar_calendario(e, jsonb_build_array(jsonb_build_object('plan_clase_id', p1, 'fecha', hoy_ar() - 20, 'estado', 'suspendida')));
  if not (select aviso_pendiente from clases where edicion_id = e) then raise exception 'FALLO: guardar sin cambios perdió el aviso pendiente'; end if;
  -- Enviado (la app baja la marca) y sin cambios: no vuelve a marcarse.
  update clases set aviso_pendiente = false where edicion_id = e;
  perform guardar_calendario(e, jsonb_build_array(jsonb_build_object('plan_clase_id', p1, 'fecha', hoy_ar() - 20, 'estado', 'suspendida')));
  if (select aviso_pendiente from clases where edicion_id = e) then raise exception 'FALLO: sin cambios se volvió a marcar un aviso ya enviado'; end if;
  -- Reprogramarla (cambia la fecha) sí vuelve a marcar.
  perform guardar_calendario(e, jsonb_build_array(jsonb_build_object('plan_clase_id', p1, 'fecha', hoy_ar() - 18, 'estado', 'reprogramada')));
  if not (select aviso_pendiente from clases where edicion_id = e) then raise exception 'FALLO: reprogramar no dejó el aviso pendiente'; end if;
  -- Volver a programada limpia la marca.
  perform guardar_calendario(e, jsonb_build_array(jsonb_build_object('plan_clase_id', p1, 'fecha', hoy_ar() - 18, 'estado', 'programada')));
  if (select aviso_pendiente from clases where edicion_id = e) then raise exception 'FALLO: una clase programada conserva el aviso pendiente'; end if;
end $$;

-- ── 9. El profesor de una edición tiene que ser un profesor ──────────────────────────────────
do $$ begin
  begin
    update ediciones set profesor_id = (select a3 from ctx) where id = (select edicion from ctx);
    raise exception 'FALLO: se asignó a un alumno como profesor';
  exception when others then if sqlerrm not like '%no es un profesor%' then raise; end if; end;
end $$;

-- ── 10. Aulas del sitio (RF-60): el visitante ve solo la ficha pública de las aulas activas y visibles ──
-- Dos aulas de prueba con ficha visible: una activa y otra dada de baja (sin ediciones, así se puede dar de baja).
insert into aulas (nombre, capacidad) values ('Aula de prueba visible', 7), ('Aula de prueba de baja', 7);
do $$ declare v uuid := (select id from aulas where nombre = 'Aula de prueba visible');
                     b uuid := (select id from aulas where nombre = 'Aula de prueba de baja');
begin
  insert into cms_aulas (aula_id, descripcion, visible) values (v, 'Visible', true), (b, 'De baja', true);
  insert into cms_aula_fotos (aula_id, imagen_url, alt) values (v, '/images/about.jpg', 'Foto'), (b, '/images/about.jpg', 'Foto');
  update aulas set activa = false where id = b;
  -- La foto sin texto alternativo no se guarda.
  begin
    insert into cms_aula_fotos (aula_id, imagen_url, alt) values (v, '/images/about.jpg', '  ');
    raise exception 'FALLO: se guardó una foto de aula sin texto alternativo';
  exception when check_violation then null; end;
end $$;
select set_config('app.user_id', '', true);
set local role anon;
do $$ declare n int; begin
  select count(*) into n from aulas_publicas where nombre like 'Aula de prueba%';
  if n <> 1 then raise exception 'FALLO: anon ve % aulas de prueba (esperaba solo la activa y visible)', n; end if;
  select count(*) into n from aula_fotos_publicas f join aulas_publicas a on a.id = f.aula_id where a.nombre like 'Aula de prueba%';
  if n <> 1 then raise exception 'FALLO: anon ve % fotos de aulas de prueba (esperaba 1)', n; end if;
  -- La capacidad y el uso interno no son públicos: ni la tabla de aulas ni las fichas se leen directo.
  begin perform 1 from aulas limit 1; raise exception 'FALLO: anon pudo leer aulas'; exception when insufficient_privilege then null; end;
  begin perform 1 from cms_aulas limit 1; raise exception 'FALLO: anon pudo leer cms_aulas'; exception when insufficient_privilege then null; end;
  begin perform 1 from cms_aula_fotos limit 1; raise exception 'FALLO: anon pudo leer cms_aula_fotos'; exception when insufficient_privilege then null; end;
  if has_table_privilege('anon', 'aulas_publicas', 'insert') or has_table_privilege('anon', 'cms_aulas', 'select') then
    raise exception 'FALLO: anon tiene permisos de más sobre las aulas del sitio';
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'aulas_publicas' and column_name = 'capacidad') then
    raise exception 'FALLO: aulas_publicas expone la capacidad';
  end if;
end $$;
reset role;

\echo 'Reglas de negocio: OK'
rollback;
