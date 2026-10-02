-- Seed mínimo: SIN datos ficticios de cursos, alumnos ni precios.
-- Aulas (la academia tiene 3) y ajustes de contacto del sitio.

insert into aulas (nombre) values ('Aula 1'), ('Aula 2'), ('Aula 3') on conflict do nothing;

insert into site_settings (clave, valor) values
  ('contacto', '{"direccion":"La Rioja 345, X5022 Córdoba","telefono":"","email":"","whatsapp":"","instagram":"","horario":""}'),
  ('hero', '{"titulo":"","subtitulo":"","imagen_url":"","cta_cursos":"Ver cursos","cta_whatsapp":"WhatsApp"}'),
  ('stats', '{"aulas":3,"profesores":10,"egresados":0}'),
  ('nosotros', '{"titulo":"","texto":""}'),
  ('areas', '{"diseno":{"titulo":"Creación y Diseño","texto":"","imagen_url":""},"tecnico":{"titulo":"Reparación y Tecnología","texto":"","imagen_url":""}}')
on conflict (clave) do nothing;

-- Primer administrador: crealo desde Auth > Users del panel de Supabase
-- (o con docs/SETUP-SUPABASE.md) y luego ejecutá:
--   update profiles set rol = 'admin', estado_cuenta = 'activa' where email = 'TU-EMAIL';
