-- 0031 · «Construyendo profesionales» muestra la foto del GRUPO que terminó cada curso o taller, no a una persona.
-- `cms_egresados` pasa a ser una fila por grupo: `curso` (antes `nombre`) y `promocion` (antes `especialidad`,
-- ej. «Marzo 2026», opcional). Se renombran las columnas en vez de recrear la tabla: las filas cargadas, el RLS y
-- los permisos se conservan; el admin las reescribe desde Campus › Sitio web › Egresados.
alter table cms_egresados rename column nombre to curso;
alter table cms_egresados rename column especialidad to promocion;
alter table cms_egresados alter column promocion drop not null;
comment on table cms_egresados is 'Fotos de los grupos de egresados por curso o taller (inicio, «Construyendo profesionales»).';
