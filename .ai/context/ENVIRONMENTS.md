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
- Seed: `npm run seed:dev` / `seed-pruebas.mts` con `ENV_FILE`; se niega a correr si `APP_ENV` no es `development`/`test`. **Nunca contra producción.**
- Primer admin: `scripts/crear-admin.mjs` (ver `docs/DESPLIEGUE-COOLIFY.md`).
- Cuentas de prueba: dominio `@demo.example.com`, contraseña `demo1234` en los seeds de desarrollo y homologación (`docs/CUENTAS-HOMOLOGACION.md`, gitignored).
- La CI (`.github/workflows/ci.yml`) corre `type-check`, `build`, migraciones desde cero (y segunda corrida idempotente), verifica RLS en todas las tablas, que un alta sin invitación no genere perfil y que `auth.users`/`auth.tokens` no sean legibles por `anon`/`authenticated`; y arma la imagen Docker.
