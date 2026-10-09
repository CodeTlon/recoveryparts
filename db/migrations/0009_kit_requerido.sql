-- Kit por ítem: necesario vs. recomendado (RF-45/46). Antes todo ítem se mostraba igual; hay materiales
-- imprescindibles para cursar y otros solo sugeridos (con link de compra, p. ej. a Mundo Parts).
-- Por defecto un ítem es requerido (el comportamiento anterior no cambia para lo ya cargado).
alter table public.kit_items add column if not exists requerido boolean not null default true;

-- La vista pública tiene columnas fijas: se recrea sumando `requerido` al final.
create or replace view public.kit_publico with (security_invoker = false) as
SELECT k.id,
    k.curso_id,
    k.orden,
    k.nombre,
    k.descripcion,
    k.precio,
    k.link_externo,
    k.requerido FROM kit_items k
     JOIN cursos c ON c.id = k.curso_id
  WHERE c.activo;
