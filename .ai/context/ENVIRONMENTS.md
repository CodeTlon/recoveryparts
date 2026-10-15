# ENVIRONMENTS — Recovery Parts

Detalle y flujo de ramas: `docs/ENTORNOS.md`. Despliegue: `docs/DESPLIEGUE-COOLIFY.md`. Acá, lo mínimo para no equivocarse.

| Entorno | Rama | Postgres | Variables |
|---|---|---|---|
| Desarrollo | `feature/*` → `dev` | local (Docker, `docker-compose.yml`, puerto 54322) | `.env.development` (versionado, sin secretos) |
| Homologación | `test` | Coolify (recurso Docker Compose, volumen propio) | variables del panel de Coolify; `.env.test` (gitignored) para correr scripts a mano |
| Producción | `main` | Coolify (recurso aparte) | variables del panel de Coolify; `.env.production` (gitignored) |

- `docker-compose.yml` es lo que usa Coolify (sin puertos publicados); `docker-compose.override.yml` solo abre el 54322 en desarrollo. `NEXT_PUBLIC_SITE_URL` tiene que llegar también como argumento de build; los links de mail la leen en runtime (`src/lib/env.ts`).
- Variables: `DATABASE_URL`, `SESSION_SECRET` (32+), `STORAGE_DIR`, `NEXT_PUBLIC_SITE_URL`, `APP_ENV`, SMTP (`SMTP_*`, `MAIL_FROM`). Ver `.env.example`.
- Migraciones: `db/migrations/NNNN_*.sql`; las aplica `scripts/migrate.mjs` (local: `npm run db:migrate`; en Coolify corre solo al arrancar la app, `docker-entrypoint.sh`). `db/bootstrap.sql` crea los roles y `auth.uid()`/`auth.role()` (reemplazan a Supabase).
- Seed: `npm run seed:dev` / `seed-pruebas.mts` con `ENV_FILE`; se niega a correr si `APP_ENV` no es `development`/`test`. **Nunca `seed:dev`/`seed:test` contra producción.** Única excepción (demo al cliente): `npm run seed:demo-cliente` con `ALLOW_DEMO_SEED=1`, y `seed:demo-cliente:purge` para deshacerlo (ver `DECISIONS.md` 2026-10-12).
- Primer admin: `scripts/crear-admin.mjs` (ver `docs/DESPLIEGUE-COOLIFY.md`).
- Cuentas de prueba: dominio `@demo.example.com`, contraseña `demo1234` en los seeds de desarrollo y homologación (`docs/CUENTAS-HOMOLOGACION.md`, gitignored).
- La CI (`.github/workflows/ci.yml`) corre `type-check`, `build`, migraciones desde cero (y segunda corrida idempotente), verifica RLS en todas las tablas, que un alta sin invitación no genere perfil y que `auth.users`/`auth.tokens` no sean legibles por `anon`/`authenticated`; y arma la imagen Docker.

## Workflows y variables (2026-10-15)
- `ci.yml`: tipos + build, migraciones/reglas, imagen Docker y E2E (3 viewports). `entornos.yml`: push a `test` → espera el deploy (`started_at` de `/api/health`) y corre E2E contra la variable de repo `TEST_URL`; sin ella o con `test` apagado no hace nada. `produccion.yml` y `backup-check.yml`: llave `PRODUCCION_HABILITADA=true`, Environment `prod-coolify` (`PROD_URL`, `SMOKE_RUTAS`, `BACKUP_BUCKET`, `BACKUP_PROJECT`, claves de B2 solo lectura en secrets).
- Video: `TRANSCODE_API_KEY` (y `TRANSCODE_SERVICE_URL`, opcional con valor por defecto) solo en las variables del recurso de Coolify; vacías = se guarda el video como llega. Ver `docker-compose.yml`.
- Backup de prod: B2 con `backup-coolify.sh` (cron en el VPS, `FILES_MODE=volume`). Clave B2 compartida por la flota; nunca en el repo.
