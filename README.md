# Recovery Parts — sitio web + campus virtual

Academia de cursos y talleres técnicos. Next.js 15 + Tailwind + Postgres propio (sin ORM) + archivos en volumen, desplegado con Docker Compose en Coolify.

- Sitio público: `/`, `/cursos`, `/cursos/[slug]`, `/galeria` (contenido desde el CMS).
- Campus: `/login` → `/campus/{admin,profesor,alumno}` (autorización por rol en servidor + RLS en Postgres).
- No incluye pagos, inscripciones, asistencia ni stock (los maneja software externo).

## Desarrollo
```bash
npm install
npm run db:start    # Postgres local en Docker (docker-compose.yml, puerto 54322)
npm run db:migrate  # aplica db/migrations
npm run seed:dev    # cuentas y cursos de prueba (opcional)
npm run dev         # http://localhost:3000
```
Requiere Node 22 (el Dockerfile y el CI usan 22) y Docker. Entornos y ramas: `docs/ENTORNOS.md`.

## Documentación
- `CLAUDE.md` — contexto de alto nivel y reglas del proyecto.
- `docs/ESPECIFICACION-ACADEMIA.md` — especificación funcional (v0.6).
- `docs/ENTORNOS.md` — entornos, ramas, CI y configuración única.
- `docs/ARQUITECTURA.md` — capas, seguridad, modelo de datos y flujos.
- `.ai/context/DECISIONS.md` — registro de decisiones.
- `docs/DESPLIEGUE-COOLIFY.md` — recursos de Coolify, variables, primer admin y backups.
- `docs/propuestas/` — explicación de mejoras grandes ya incorporadas (ediciones de curso, estructura del curso).

## Calidad (estándar CodeTlon)
CI (`.github/workflows/ci.yml`): tipos + build, migraciones desde cero con reglas de RLS, imagen Docker y **E2E de humo en 3 viewports** (36 pruebas, `npm run test:e2e`). Workflows de entorno: `entornos.yml` (push a `test`: espera el deploy y corre los E2E contra `TEST_URL`; si `test` está apagado avisa y no falla), `produccion.yml` (smoke de producción, llave `PRODUCCION_HABILITADA`) y `backup-check.yml` (alarma diaria de backup en B2). `npm audit --omit=dev --audit-level=high` en 0.

## Changelog

| Versión | Fecha | Cambio |
|---|---|---|
| v0.14.1 | 2026-10-15 | **Documentación al día tras la salida de Supabase/Vercel.** `PROJECT.md` (stack real), `CONVENTIONS.md` (`server-only` ya no depende de una clave de Supabase), `KNOWN_ISSUES.md` (ítems de Vercel/Supabase marcados como históricos) y `CURRENT_STATE.md`. Sin cambios de código. **Pendiente:** el compose de Coolify se llama `docker-compose.yml` (el estándar usa `docker-compose.coolify.yml`); no se renombró para no romper la ruta configurada en el recurso vivo. Comentarios de `src/lib/media.ts` y `security-headers.ts` aún citan Vercel como motivo histórico. |
| v0.14.0 | 2026-10-15 | **Alineado con el estándar CodeTlon de Coolify**: Node 22 (Dockerfile y CI), `/api/health` con `started_at`, E2E de humo en 3 viewports (36) con job en CI, workflows `entornos`/`produccion`/`backup-check` de plantilla, y `npm audit` en 0 (Next 15.5.28, override del `postcss` que trae Next, Playwright 1.64, sharp). **Video**: `/api/media` recomprime los videos con el servicio global de CodeTlon (`src/lib/transcode.ts`, `TRANSCODE_API_KEY` solo en Coolify, soft-fail: sin servicio se guarda el video como llega; la compresión del navegador se mantiene como primer paso). `dev` y `test` al día. Excepciones documentadas: sesión propia (`SESSION_SECRET`) y SMTP en vez de Better Auth y Resend. **Sin verificar**: la recompresión con un video real contra el servicio. |
