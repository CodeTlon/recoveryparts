# Recovery Parts — sitio web + campus virtual

Academia de cursos y talleres técnicos. Next.js 16.4.2 + React 19 + Tailwind 4 + Postgres propio (sin ORM) + archivos en volumen, desplegado con Docker Compose en Coolify.

- Sitio público: `/`, `/cursos`, `/cursos/[slug]`, `/galeria` (contenido desde el CMS).
- Campus: `/login` → `/campus/{admin,profesor,alumno}` (autorización por rol en servidor + RLS en Postgres).
- No incluye pagos, inscripciones, asistencia ni stock (los maneja software externo).

## Desarrollo
```bash
npm install
npm run db:start    # Postgres local en Docker (docker-compose.yml, solo la base, puerto 54322)
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
CI (`.github/workflows/ci.yml`): tipos + lint + build, migraciones desde cero con reglas de RLS y **reglas de negocio de la base** (`tests/db/reglas.sql`), imagen Docker y **E2E en 3 viewports con base de datos** (62 pruebas: humo, acceso/activación/logout y CSP; `npm run test:e2e`, los de acceso piden `DATABASE_URL`). Workflows de entorno: `entornos.yml` (push a `test`: espera el deploy y corre los E2E contra `TEST_URL`; si `test` está apagado avisa y no falla), `produccion.yml` (smoke de producción, llave `PRODUCCION_HABILITADA`) y `backup-check.yml` (alarma diaria de backup en B2). `npm audit --omit=dev --audit-level=high` en 0.

## Changelog

| Versión | Fecha | Cambio |
|---|---|---|
| v0.16.0 | 2026-10-21 | **Auditoría de seguridad, lógica, estilos/accesibilidad, SEO y rendimiento.** Seguridad: el link de acceso se consume con un POST y abre una sesión de activación de 15 min, el logout revoca la sesión, CSP con nonce, IP del cliente desde el proxy, rate limit sin reset total. Lógica: `finalizado` es estado final (0019), calendario atómico (0022), validaciones en el servidor (0023), fin de edición con duración del curso (0020), acciones de botón con error visible. Rendimiento: `set_config` en pipeline, caché del sitio público (60 s con tag), ZIP/PDF por streaming, índices (0021), pool SMTP, reportes sin O(n²). SEO: metadata/canonical/Open Graph por página, imagen social, JSON-LD. Estilos: tokens `danger/success/warning/info`, contraste de bordes, foco, galería sin CLS, video con reduced-motion. Corrige `/activar`, que salía estática y siempre mostraba «El link venció». Tokens de invitación 7 días / reset 1 hora (spec v0.15). Pendientes en `.ai/context/KNOWN_ISSUES.md`. |
| v0.15.0 | 2026-10-16 | **Estandar de versiones de la flota** (`codetlon-cloud/.claude/modules/stack-versions.md`). Next 16.4.2, React 19.3.1, Tailwind 4.3.3 (config a `@theme`, PostCSS oficial, sin autoprefixer), TypeScript 6.0.3, ESLint 10.13.0 **nuevo** (`npm run lint`, config plana; `no-explicit-any` y reglas nuevas de React como aviso: 66 avisos, 0 errores), `middleware.ts` pasa a `proxy.ts`, Playwright 1.64.1, `@types/node` 22, `tailwind-merge` 3, `lucide-react` 0.577, `useRef` de React 19. Se retira el override de `postcss` dentro de Next (ya no hace falta). `npm audit --omit=dev` en 0; el audit completo conserva solo `braces` <= 3.0.3 (cadena de `eslint-config-next`, herramienta de lint, sin version corregida publicada; no entra a la imagen). Verificado: `tsc`, build, 36 E2E en 3 viewports contra Postgres, imagen Docker Alpine construida y comparacion visual con base real (iguales salvo 12 a 16 px menos en `/contacto` y `/cursos`). **Sin verificar:** el seed de pruebas fallo en esta maquina (no afecta a los E2E, que no lo usan) y el despliegue en Coolify (sin recursos). |
| v0.14.3 | 2026-10-15 | **Fuentes autoalojadas.** `next/font/google` reemplazado por `next/font/local` con los `woff2` (subset latin) dentro del repo: el build ya no baja fuentes de Google, que fallaba de forma intermitente en el CI y en el build de la imagen Docker. Mismas variables CSS, sin cambios visuales esperados. Detalle, origen y licencia (OFL) en `FONTS.md`. Verificado: `tsc` y build locales. **Sin verificar:** comparación visual en navegador. |
| v0.14.2 | 2026-10-15 | **Compose estándar.** `docker-compose.yml` pasa a `docker-compose.coolify.yml` (lo que usa Coolify) y `docker-compose.yml` queda solo con Postgres para desarrollo, sin `docker-compose.override.yml`. `docs/DESPLIEGUE-COOLIFY.md` indica la nueva ruta (*Docker Compose Location* `/docker-compose.coolify.yml`); los recursos de Coolify todavía no estaban creados. Comentarios de `media.ts` y `security-headers.ts` sin Vercel como estado actual. Verificado: `docker compose config` válido en ambos archivos. **Sin verificar:** levantar el stack completo y el CI en `test`. |
| v0.14.1 | 2026-10-15 | **Documentación al día tras la salida de Supabase/Vercel.** `PROJECT.md` (stack real), `CONVENTIONS.md` (`server-only` ya no depende de una clave de Supabase), `KNOWN_ISSUES.md` (ítems de Vercel/Supabase marcados como históricos) y `CURRENT_STATE.md`. Sin cambios de código. **Pendiente:** el compose de Coolify se llama `docker-compose.yml` (el estándar usa `docker-compose.coolify.yml`); no se renombró para no romper la ruta configurada en el recurso vivo. Comentarios de `src/lib/media.ts` y `security-headers.ts` aún citan Vercel como motivo histórico. |
| v0.14.0 | 2026-10-15 | **Alineado con el estándar CodeTlon de Coolify**: Node 22 (Dockerfile y CI), `/api/health` con `started_at`, E2E de humo en 3 viewports (36) con job en CI, workflows `entornos`/`produccion`/`backup-check` de plantilla, y `npm audit` en 0 (Next 15.5.28, override del `postcss` que trae Next, Playwright 1.64, sharp). **Video**: `/api/media` recomprime los videos con el servicio global de CodeTlon (`src/lib/transcode.ts`, `TRANSCODE_API_KEY` solo en Coolify, soft-fail: sin servicio se guarda el video como llega; la compresión del navegador se mantiene como primer paso). `dev` y `test` al día. Excepciones documentadas: sesión propia (`SESSION_SECRET`) y SMTP en vez de Better Auth y Resend. **Sin verificar**: la recompresión con un video real contra el servicio. |
