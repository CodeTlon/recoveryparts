# CURRENT_STATE — Recovery Parts

Qué es verdad ahora (2026-10-05). Esto envejece rápido: si pasó más de un mes, verificá contra el código y git antes de confiar.

## Ramas
- `feat/ojito-password-seed-demo` (local, **sin mergear**): ojito en las contraseñas, placeholders, modales (usuarios, confirmaciones), editores por filas del curso (horarios/plan/kit/calendario) con pestañas, imagen de curso subida desde el form, reportes con gráficos, favicon, scrollbar, validaciones de rango y seed de demo (5 cursos, 4 talleres cortos, 6 alumnos, cuentas `@demo.example.com`/`demo1234`). **Sin migraciones nuevas.**
- La auditoría (`fix/auditoria-seguridad`, migraciones `0007`/`0008`) ya está en `dev`. Las constraints de `materiales` y `encuestas` quedaron `NOT VALID`: si hay datos viejos incorrectos, corregirlos y correr `VALIDATE CONSTRAINT`.
- `test` y `main` están en el linaje viejo de `feat/unificacion` (otro esquema: `matriculas`, `sitio_config`, `faq`; migraciones `0001_auth_profiles…0011`). **No son ancestros de `dev`**: llevar `dev` a `test` requiere dejar `test` igual a `dev` (reescribe la rama remota) o resolver ~32 conflictos. Decisión pendiente (ver `OPEN_QUESTIONS.md`).
- La base de homologación se recreó desde las migraciones de `dev` (0001–0008) y se cargó con `npm run seed:test`.

## Pendientes de la spec (🟡, preguntar antes de implementar)
RF-03 (aulas/cupos/insumos/precios), RF-12 y RF-13 (alta de alumno con curso / vincular a curso nuevo), RF-14 (al finalizar queda sin curso), RF-40 (recordatorios masivos por WhatsApp; choca con «avisos solo por mail», probablemente se cancele).

## Pendientes operativos (sin verificar al 2026-10-02)
SMTP propio y plantillas de Auth apuntando a `/auth/confirm` · desactivar el registro público en el Auth remoto · rotar las claves y la contraseña de base que se compartieron por chat · crear el proyecto Supabase de producción · proteger ramas y crear environments en GitHub · imágenes finales sin flyers viejos y con consentimiento · dominio.

## Hecho
Sesión 2026-10-05: demo para el cliente. Modales propios (sin `alert`/`confirm`), editores por filas, tabs en el curso, gráficos SVG en reportes, favicon con el logo, validaciones de rango en cliente y servidor, bug del profesor (`FileField`: una página de servidor no puede pasar una función como hijo de un componente cliente). Probado con Chrome (Playwright) a 375/768/1280 px: sin desbordes; subida de imagen y PDF, avisos de éxito/error y modal de confirmación verificados.

Auditoría (2026-10-04): URLs `javascript:` y `storage_path` ajeno bloqueados en la base, baja de cuenta revoca sesiones, fechas en hora de Córdoba, encuestas validadas, calendario/horarios/temario/kit atómicos, CSP/HSTS, accesibilidad y SEO del sitio y del campus, ZIP solo con lo liberado, reactivar curso. Tres entornos armados, CI con RLS obligatorio, homologación funcionando, rediseño del sitio y del campus en `dev`.
