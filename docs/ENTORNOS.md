# Entornos y ramas

| Entorno | Rama | App | Base de datos |
|---|---|---|---|
| **Desarrollo** | `feature/*` → `dev` | `npm run dev` en tu máquina (`.env.development`) | Postgres en Docker (`npm run db:start`) |
| **Homologación** | `test` | Coolify (recurso Docker Compose) | Postgres del mismo recurso, volumen propio |
| **Producción** | `main` | Coolify (otro recurso) | Postgres del mismo recurso, volumen propio |

Flujo: `feature/* → dev → test → main`. `feature → dev` y `dev → test` son **merge** directo; solo `test → main` es **PR**. `dev` y `test` se mergean y pushean directo (sin PRs hacia ellas); `main` solo por PR (producción). `dev` se promueve a `test` cuando una tanda está lista para que el cliente la mire; `test` pasa a `main` cuando se aprueba.

## Desarrollo
```bash
npm run db:start      # Postgres en Docker (127.0.0.1:54322)
npm run db:migrate    # aplica db/migrations
npm run seed:dev      # cuentas y datos de prueba (imprime las contraseñas)
npm run dev
```
`npm run db:reset` borra la base local y la rehace desde las migraciones. Los archivos subidos quedan en `./storage` (ignorado por git).

## Migraciones
1. Se agrega `db/migrations/NNNN_nombre.sql` (nunca se edita una ya aplicada) con RLS y políticas por rol si es una tabla nueva (la CI falla si falta).
2. Se prueba con `npm run db:reset`.
3. Al mergear a `test`/`main`, Coolify redeploya y `docker-entrypoint.sh` aplica las pendientes antes de arrancar la app. `scripts/migrate.mjs` es idempotente y registra cada archivo en `schema_migrations`.

## Homologación y producción
Ver `docs/DESPLIEGUE-COOLIFY.md` (variables, volúmenes, primer administrador, backups). El seed se niega a correr si `APP_ENV` no es `development` o `test`; en homologación se usa `npm run seed:test` con un `.env.test` propio (gitignored) apuntando a esa base. **Nunca correr `seed:dev`/`seed:test` contra producción.**

### Demo para el cliente en producción (temporal)
Mientras se entrega la demo, producción puede llevar datos de prueba: `ALLOW_DEMO_SEED=1 npm run seed:demo-cliente` (con `.env.production`, desde un entorno con acceso a la base). Aborta si hay alumnos/profesores reales y genera contraseñas al azar (se imprimen una vez; guardalas). Para pasar a datos reales: backup (`pg_dump`) y `ALLOW_DEMO_SEED=1 npm run seed:demo-cliente:purge`; después reeditá hero/áreas/contacto desde el CMS.

## CI y workflows (2026-10-15)
- `ci.yml` (PR y push): tipos + build, migraciones desde cero + reglas de RLS, imagen Docker y E2E de humo en 3 viewports (`tests/e2e/smoke.spec.ts`, 36 pruebas). Node 22.
- `entornos.yml`: push a `test` → si el recurso de test está encendido espera el deploy (por `started_at` de `/api/health`) y corre los E2E contra la variable de repo `TEST_URL`; si está apagado avisa y termina sin fallar.
- `produccion.yml`: push a `main` → espera el deploy y hace un smoke test (rutas en `SMOKE_RUTAS`). `backup-check.yml`: alarma diaria si no hay un dump de menos de 24 h en B2. Ambos exigen `PRODUCCION_HABILITADA=true` y el Environment `prod-coolify`.
- Correr los E2E en local: `npx playwright test` (levanta `npm run build && npm start`); con un Chromium ya instalado, `PW_CHROMIUM_PATH=<ruta>`.

## Video
Los videos subidos al CMS se recomprimen en el servidor con el servicio global de CodeTlon (`src/lib/transcode.ts`, preset `web`). Se activa con `TRANSCODE_API_KEY` en Coolify; sin ella el video queda como llega del navegador (que ya lo comprime a ≤720p).
