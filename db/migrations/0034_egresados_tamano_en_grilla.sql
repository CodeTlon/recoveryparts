-- 0034 · Cada foto de egresados elige cuánto ocupa en la grilla del inicio (pedido del cliente, 2026-11-03), como la
-- galería de inglobal-site: columnas × filas en el celular (grilla de 2 columnas) y en la computadora (3 columnas).
-- Antes lo decidía el código: cada sexta foto, doble ancho. Las filas existentes arrancan con ese mismo reparto para
-- que el inicio no cambie hasta que el admin elija otro tamaño. Mismo RLS y permisos de la tabla (0003/0028).
alter table cms_egresados
  add column cols_movil smallint not null default 1 check (cols_movil between 1 and 2),
  add column filas_movil smallint not null default 1 check (filas_movil between 1 and 2),
  add column cols smallint not null default 1 check (cols between 1 and 3),
  add column filas smallint not null default 1 check (filas between 1 and 2);

with ordenadas as (
  select id, row_number() over (order by destacado desc, orden, id) as n from cms_egresados
)
update cms_egresados e set cols_movil = 2, cols = 2
from ordenadas o where o.id = e.id and o.n % 6 = 1;
