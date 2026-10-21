-- 0028 · El visitante anónimo (rol `anon`) solo tiene acceso a lo que el sitio público usa.
-- Hasta ahora `anon` tenía SELECT a nivel de tabla sobre TODAS las tablas de `public` (permisos por defecto estilo
-- Supabase) y lo único que lo frenaba era RLS: una política mal escrita habría expuesto inscripciones, perfiles o
-- respuestas de encuestas. Ahora, además de RLS, no tiene el privilegio.
-- Las vistas públicas (*_publicos/*_publicas) corren con los permisos de su dueño (security_invoker = false), así que
-- anon no necesita acceso a las tablas que consultan.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Lo que el sitio lee: contenido del CMS y el catálogo público.
grant select on site_settings, cms_egresados, cms_testimonios, cms_faq, cms_galeria to anon;
grant select on cursos_publicos, ediciones_publicas, horarios_publicos, modulos_publicos, kit_publico to anon;
-- Lo que el sitio escribe: formulario de contacto y demanda de cursos (las políticas acotan largos y campos).
grant insert on contactos, demanda_cursos to anon;

-- Las tablas que se creen de ahora en más NO le dan acceso a anon salvo que la migración lo conceda explícitamente.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
