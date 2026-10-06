# CURRENT_STATE — Recovery Parts

Qué es verdad ahora (2026-10-06). Esto envejece rápido: si pasó más de un mes, verificá contra el código y git antes de confiar.

## Ramas
- `dev`, `test` y `main` al día con la **estructura del curso** (PR #11 `test → main`, mergeado el 2026-10-06): estructura del curso módulos → clases → material (RF-58), orden flexible por edición y liberación siempre manual (RF-32). Migraciones **0012–0014**.
- `dev`, `test` y `main` están al día con **gestión de aulas (RF-03)** y **ediciones de curso** (PR #7 `test → main`, mergeado el 2026-10-06). Las ramas de trabajo de esas mejoras ya se mergearon.
- La rama remota `feat/unificacion` es otro linaje (esquema `matriculas`/`sitio_config`/`faq`, migraciones `0001_auth_profiles…0011`) y quedó **descartada**: `dev` ya tiene todo lo equivalente.
- Las constraints de `materiales` y `encuestas` de la auditoría (0007/0008) quedaron `NOT VALID`: si hay datos viejos incorrectos, corregirlos y correr `VALIDATE CONSTRAINT`.

## Entornos y base de datos
- **Homologación = base de la demo del cliente.** El proyecto Supabase «RecoveryParts HOMOLOGACIÓN» (ref `kdgjcgtuknexzimnpksz`) es el que usa el sitio `recoveryparts-biud.vercel.app`, que despliega `main`. Tiene aplicadas **0001–0014**: 0012–0014 (estructura del curso) se aplicaron a mano el 2026-10-06 junto con el deploy del PR #11. **Falta recargar los cursos de la demo** en «Estructura» (las clases quedaron en «Sin módulo») y liberar a mano el material. Antes: la 0009, la 0010 y la 0011 se aplicaron **a mano en el SQL Editor** el 2026-10-06 (la 0011 justo después del deploy del PR #7) y están registradas en `supabase_migrations.schema_migrations`.
- Hay un segundo proyecto Supabase, «Recovery Parts» (us-west-2). **Sin verificar** si es o será producción.
- El workflow «Migraciones a Supabase» falla en `test` y `main` porque falta el secreto `SUPABASE_DB_URL` en los environments de GitHub (ver `KNOWN_ISSUES.md`).
- Las aulas de la demo tienen capacidad cargada desde el 2026-10-06 (Aula 1 = 12, Aula 2 = 10, Aula 3 = 10; provisorias, ajustar a las reales en Campus › Aulas). El cupo de cada edición ya se valida contra su aula.
- La demo tiene **una edición por curso** (los datos migrados). Para mostrar la recurrencia, duplicar una edición desde el campus.

## Pendientes de la spec (🟡, preguntar antes de implementar)
RF-12 y RF-13 (alta de alumno con curso / vincular a curso nuevo), RF-14 (al finalizar queda sin curso), RF-40 (recordatorios masivos por WhatsApp; choca con «avisos solo por mail», probablemente se cancele).

## Pendientes operativos (sin verificar al 2026-10-02, salvo lo marcado)
Cargar en GitHub el secreto `SUPABASE_DB_URL` en los environments `test` y `production` (lo tiene que hacer un admin del repo) · separar la base de homologación de la de la demo del cliente · SMTP propio y plantillas de Auth apuntando a `/auth/confirm` · desactivar el registro público en el Auth remoto · rotar las claves y la contraseña de base que se compartieron por chat · crear el proyecto Supabase de producción · proteger ramas y crear environments en GitHub · imágenes finales sin flyers viejos y con consentimiento · dominio.

## Hecho
Sesión 2026-10-06 (2): **estructura del curso** (RF-58): módulos → clases (teóricas/prácticas) → material, regla en la base, pestaña «Estructura» para admin y profesor, temario del alumno por módulo, ficha pública solo con títulos de módulos, adelantar/saltear clases por edición y liberación siempre manual. Seed con un curso de 4 módulos, una clase salteada y otra adelantada.

Sesión 2026-10-06: las imágenes (curso, foto del profesor, egresados, testimonios, galería) aceptan rutas del propio sitio (`/images/…`) además de URLs http(s) (`imagenOpcional` en `src/lib/validar.ts`); los cursos y el contenido del seed ya se pueden guardar desde el campus.

Sesión 2026-10-05/06 (5): **ediciones de curso** (cursos recurrentes; migración 0011): el curso es el catálogo y cada dictado una edición; duplicar edición, una por vez, material liberado por edición, sitio con «Próximas fechas». Mergeado a `dev`, `test` y `main` (PR #7). Migraciones 0009–0011 aplicadas a mano en homologación/demo, coordinadas con el deploy. Propuesta para el equipo en `docs/propuestas/ediciones-de-curso.md`.

Sesión 2026-10-05 (4): gestión de aulas (RF-03 🟢). Pantalla Campus › Aulas (crear/editar en modal, baja lógica y reactivación con el motivo si la base lo impide), selector de aula del curso con capacidad y cupo sugerido, reglas en la base (migración 0010) y auditoría sobre `aulas`. `supabase/seed.sql` carga capacidades provisorias (12/10/10) porque la capacidad es obligatoria en aulas nuevas.

Sesión 2026-10-05 (3): el Resumen del admin se fusionó con Reportes (novedades + indicadores y gráficos; `/campus/admin/reportes` redirige) y «Sitio web» se edita por pestañas (inicio, contacto, egresados, testimonios, preguntas, galería, imágenes, campus), cada una con leyenda y link para verla en el sitio.

Sesión 2026-10-05 (2): sitio con `/contacto` y `/preguntas-frecuentes` propias (la home muestra 4 FAQ y una banda a contacto), módulos visibles en las tarjetas de `/cursos`, kit por ítem «necesario»/«recomendado» con compra en Mundo Parts (migración `0009_kit_requerido.sql`: `kit_items.requerido` y `kit_publico`), seed con 19 cursos/talleres, 9 testimonios, 8 FAQ, egresados, galería e Instagram real. Admin del seed: Maxi Escaroni.

Sesión 2026-10-05: demo para el cliente. Modales propios (sin `alert`/`confirm`), editores por filas, tabs en el curso, gráficos SVG en reportes, favicon con el logo, validaciones de rango en cliente y servidor, bug del profesor (`FileField`: una página de servidor no puede pasar una función como hijo de un componente cliente). Probado con Chrome (Playwright) a 375/768/1280 px: sin desbordes; subida de imagen y PDF, avisos de éxito/error y modal de confirmación verificados.

Auditoría (2026-10-04): URLs `javascript:` y `storage_path` ajeno bloqueados en la base, baja de cuenta revoca sesiones, fechas en hora de Córdoba, encuestas validadas, calendario/horarios/temario/kit atómicos, CSP/HSTS, accesibilidad y SEO del sitio y del campus, ZIP solo con lo liberado, reactivar curso. Tres entornos armados, CI con RLS obligatorio, homologación funcionando, rediseño del sitio y del campus en `dev`.
