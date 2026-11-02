-- 0032 · Los egresados de la demo eran PERSONAS ficticias con retrato (`/images/egresado-N.jpg`, ver
-- seed-pruebas --demo-cliente). Con 0031 la tabla pasó a grupos, pero esas filas seguían mostrando a una persona
-- (su nombre como si fuera el curso y su cara como foto del grupo). Se convierten en un grupo por curso, sin foto:
-- `curso` toma la especialidad que tenían (quedó en `promocion`), se quita el retrato y se borran los repetidos.
-- Las filas cargadas desde el admin (fotos en /media/…) no se tocan.
with demo as (
  select id, row_number() over (partition by lower(promocion) order by orden, id) as n
  from cms_egresados
  where foto_url ~ '^/images/egresado-[0-9]+\.jpg$'
)
delete from cms_egresados where id in (select id from demo where n > 1);

delete from cms_egresados where foto_url ~ '^/images/egresado-[0-9]+\.jpg$' and promocion is null;

update cms_egresados
set curso = promocion, promocion = null, foto_url = null, destacado = false
where foto_url ~ '^/images/egresado-[0-9]+\.jpg$';
