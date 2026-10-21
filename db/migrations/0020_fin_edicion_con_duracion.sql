-- 0020 · Fin de una edición sin calendario cargado = inicio + duración del curso (RF-04).
-- Antes, sin clases el fin era el inicio: una edición de un curso largo cuyo calendario todavía no se cargó figuraba
-- como terminada apenas pasaba `fecha_inicio`, y el profesor perdía el acceso justo cuando tenía que cargarlo.
-- Con clases cargadas nada cambia (fin = última clase). Misma regla que momentoEdicion() en src/lib/fechas.ts.
create or replace function fin_edicion(p_edicion uuid) returns date
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select max(c.fecha) from clases c where c.edicion_id = e.id),
    e.fecha_inicio + (cu.duracion_semanas * 7 - 1),
    e.fecha_inicio)
  from ediciones e join cursos cu on cu.id = e.curso_id
  where e.id = p_edicion
$$;
