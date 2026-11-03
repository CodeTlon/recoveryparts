-- 0035 · Cursos de la DEMO del cliente (seed-pruebas --demo-cliente, mismos slugs) con la duración en clases (0033),
-- pedido de Mateo para que Maxi vea el cambio en producción sin cargarlos uno por uno. Se calcula igual que el seed:
-- clases = semanas × días por semana de su edición más reciente; horas = duración del horario; frecuencia según los
-- días (un taller de 1 semana con varios días = días seguidos). Solo toca cursos SIN clases cargadas: lo que el admin
-- ya haya cargado no se pisa. En una base sin esos cursos (o sin horarios) no hace nada.
with ed as (
  select distinct on (e.curso_id) e.curso_id, e.id
  from ediciones e
  where exists (select 1 from horarios_curso h where h.edicion_id = e.id)
  order by e.curso_id, e.fecha_inicio desc nulls last
), h as (
  select ed.curso_id, count(*)::int as dias,
         round(avg(extract(epoch from (hc.hora_fin - hc.hora_inicio)) / 3600) * 2) / 2 as horas
  from ed join horarios_curso hc on hc.edicion_id = ed.id
  group by ed.curso_id
)
update cursos c set
  cantidad_clases = least(c.duracion_semanas * h.dias, 300),
  horas_por_clase = least(greatest(h.horas, 0.5), 12),
  frecuencia = case when h.dias = 1 then 'semanal'
                    when c.tipo = 'taller' and c.duracion_semanas = 1 then 'dias_seguidos'
                    when h.dias = 2 then '2_por_semana'
                    else '3_por_semana' end
from h
where h.curso_id = c.id
  and c.cantidad_clases is null
  and c.duracion_semanas is not null
  and c.slug in ('reparacion-de-celulares','carteles-neon-led','taller-cambio-de-glass','reparacion-de-notebooks','armado-y-mantenimiento-de-pcs','estampados-personalizados','taller-intensivo-soldadura-smd','taller-diagnostico-con-multimetro','taller-express-sublimacion-de-tazas','impresion-3d-desde-cero','senaletica-y-carteleria','reparacion-de-televisores','taller-cambio-de-bateria','reparacion-de-iphone-avanzada','microsoldadura-de-placas','electronica-basica','diseno-grafico-para-redes','taller-fotografia-de-producto','taller-reparacion-de-consolas','reparacion-de-celulares');
