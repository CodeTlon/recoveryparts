-- 0021 · Índices que faltaban en columnas que se filtran o se usan en joins y borrados en cascada.
-- Con las tablas chicas de hoy el efecto es bajo; evita escaneos completos cuando crezcan las inscripciones y encuestas.
create index if not exists encuestas_edicion_idx on encuestas (edicion_id);                 -- encuestasPendientes, policy enc_alumno
create index if not exists encuesta_respuestas_encuesta_idx on encuesta_respuestas (encuesta_id);  -- resultados de la encuesta
create index if not exists materiales_liberados_material_idx on materiales_liberados (material_id); -- cascada al borrar material
create index if not exists cms_testimonios_curso_idx on cms_testimonios (curso_id);         -- testimonios de un curso
create index if not exists audit_log_actor_idx on audit_log (actor_id);                     -- FK al actor
create index if not exists audit_log_creado_idx on audit_log (creado_en desc);
create index if not exists profiles_rol_estado_idx on profiles (rol, estado_cuenta);        -- conteos del admin, listados por rol
create index if not exists contactos_creado_idx on contactos (creado_en desc);              -- bandeja de consultas
