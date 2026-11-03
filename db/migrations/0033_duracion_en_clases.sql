-- 0033 · Duración del curso en clases (pedido del cliente, 2026-11-02): «12 clases de 2 h · 1 vez por semana»,
-- «1 clase de 4 h». Antes solo había semanas, que no sirven para explicar un taller de una jornada.
-- `duracion_semanas` se queda: es la que usa fin_edicion() (0020) cuando la edición no tiene calendario cargado.
-- El admin ya no la carga a mano: guardarCurso() la calcula de clases + frecuencia (ver semanasDeClases()).
-- No se completan las filas existentes: inventar «N clases» a partir de las semanas sería un dato falso; hasta que
-- se carguen, el sitio sigue mostrando «N semanas».
alter table cursos
  add column cantidad_clases int check (cantidad_clases between 1 and 300),
  add column horas_por_clase numeric(3,1) check (horas_por_clase > 0 and horas_por_clase <= 12),
  add column frecuencia text check (frecuencia in ('semanal', '2_por_semana', '3_por_semana', 'dias_seguidos'));

-- Misma vista que en 0011 con las columnas nuevas al final (create or replace solo permite agregar al final;
-- conserva los grants de 0011/0028).
create or replace view cursos_publicos with (security_invoker = false) as
select c.id, c.slug, c.nombre, c.area, c.tipo, c.nivel, c.descripcion, c.requisitos,
       c.imagen_url, c.video_url, c.modalidad, c.duracion_semanas,
       c.precio, c.descuento_pct, c.precio_actualizado_en, c.destacado, c.orden,
       px.id as edicion_id, px.fecha_inicio, px.cupo, px.cupos_disponibles, px.aula,
       px.profesor_nombre, px.profesor_foto, px.profesor_experiencia, px.profesor_certificaciones,
       (select count(*)::int from ediciones_publicas ep where ep.curso_id = c.id) as ediciones_abiertas,
       c.cantidad_clases, c.horas_por_clase, c.frecuencia
from cursos c
left join lateral (
  select * from ediciones_publicas ep where ep.curso_id = c.id order by ep.fecha_inicio limit 1
) px on true
where c.activo;
