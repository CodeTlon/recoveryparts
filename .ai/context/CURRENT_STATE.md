# CURRENT_STATE — Recovery Parts

Qué es verdad ahora (2026-10-05). Esto envejece rápido: si pasó más de un mes, verificá contra el código y git antes de confiar.

## Ramas
- `feat/ediciones-cursos` (local, **sin mergear, en revisión del equipo**): ediciones de curso (migración **`0011_ediciones.sql`**, admin/profesor/alumno/sitio por edición). Propuesta para el colega en `docs/propuestas/ediciones-de-curso.md`. Si se aprueba: merge a `dev`; al pasar a `test`, la 0011 transforma los datos existentes (cada curso → una edición con el mismo id).
- `feat/gestion-aulas` (local, **sin mergear**): RF-03 (Campus › Aulas, cupo ≤ capacidad). Migración **`0010_gestion_aulas.sql`**: al pasar a homologación/producción hay que aplicarla (`db:push:*`) y cargar la capacidad real de cada aula desde el campus (mientras falte, no se valida contra esa aula).
- `feat/ojito-password-seed-demo` (local, **sin mergear**): ojito en las contraseñas, placeholders, modales (usuarios, confirmaciones), editores por filas del curso (horarios/plan/kit/calendario) con pestañas, imagen de curso subida desde el form, reportes con gráficos, favicon, scrollbar, validaciones de rango y seed de demo (5 cursos, 4 talleres cortos, 6 alumnos, cuentas `@demo.example.com`/`demo1234`). **Sin migraciones nuevas.**
- La auditoría (`fix/auditoria-seguridad`, migraciones `0007`/`0008`) ya está en `dev`. Las constraints de `materiales` y `encuestas` quedaron `NOT VALID`: si hay datos viejos incorrectos, corregirlos y correr `VALIDATE CONSTRAINT`.
- `test` y `main` están en `c0876ac`, **ancestro de `dev`**: `dev → test` es un merge simple. La rama remota `feat/unificacion` es otro linaje (esquema `matriculas`/`sitio_config`/`faq`, migraciones `0001_auth_profiles…0011`) y quedó **descartada**: `dev` ya tiene todo lo equivalente.
- La base de homologación se recreó desde las migraciones de `dev` (0001–0008) y se cargó con `npm run seed:test`.

## Pendientes de la spec (🟡, preguntar antes de implementar)
RF-12 y RF-13 (alta de alumno con curso / vincular a curso nuevo), RF-14 (al finalizar queda sin curso), RF-40 (recordatorios masivos por WhatsApp; choca con «avisos solo por mail», probablemente se cancele).

## Pendientes operativos (sin verificar al 2026-10-02)
SMTP propio y plantillas de Auth apuntando a `/auth/confirm` · desactivar el registro público en el Auth remoto · rotar las claves y la contraseña de base que se compartieron por chat · crear el proyecto Supabase de producción · proteger ramas y crear environments en GitHub · imágenes finales sin flyers viejos y con consentimiento · dominio.

## Hecho
Sesión 2026-10-05 (4): gestión de aulas (RF-03 🟢). Pantalla Campus › Aulas (crear/editar en modal, baja lógica y reactivación con el motivo si la base lo impide), selector de aula del curso con capacidad y cupo sugerido, reglas en la base (migración 0010) y auditoría sobre `aulas`. `supabase/seed.sql` carga capacidades provisorias (12/10/10) porque la capacidad es obligatoria en aulas nuevas.

Sesión 2026-10-05 (3): el Resumen del admin se fusionó con Reportes (novedades + indicadores y gráficos; `/campus/admin/reportes` redirige) y «Sitio web» se edita por pestañas (inicio, contacto, egresados, testimonios, preguntas, galería, imágenes, campus), cada una con leyenda y link para verla en el sitio.

Sesión 2026-10-05 (2): sitio con `/contacto` y `/preguntas-frecuentes` propias (la home muestra 4 FAQ y una banda a contacto), módulos visibles en las tarjetas de `/cursos`, kit por ítem «necesario»/«recomendado» con compra en Mundo Parts (migración `0009_kit_requerido.sql`: `kit_items.requerido` y `kit_publico`), seed con 19 cursos/talleres, 9 testimonios, 8 FAQ, egresados, galería e Instagram real. Admin del seed: Maxi Escaroni. **Homologación necesita `db:push:test` (0009) y `seed:test`.**

Sesión 2026-10-05: demo para el cliente. Modales propios (sin `alert`/`confirm`), editores por filas, tabs en el curso, gráficos SVG en reportes, favicon con el logo, validaciones de rango en cliente y servidor, bug del profesor (`FileField`: una página de servidor no puede pasar una función como hijo de un componente cliente). Probado con Chrome (Playwright) a 375/768/1280 px: sin desbordes; subida de imagen y PDF, avisos de éxito/error y modal de confirmación verificados.

Auditoría (2026-10-04): URLs `javascript:` y `storage_path` ajeno bloqueados en la base, baja de cuenta revoca sesiones, fechas en hora de Córdoba, encuestas validadas, calendario/horarios/temario/kit atómicos, CSP/HSTS, accesibilidad y SEO del sitio y del campus, ZIP solo con lo liberado, reactivar curso. Tres entornos armados, CI con RLS obligatorio, homologación funcionando, rediseño del sitio y del campus en `dev`.
