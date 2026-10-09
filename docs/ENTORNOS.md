# Entornos y ramas

| Entorno | Rama | App | Base de datos |
|---|---|---|---|
| **Desarrollo** | `feature/*` → `dev` | `npm run dev` en tu máquina (`.env.development`) | Postgres en Docker (`npm run db:start`) |
| **Homologación** | `test` | Coolify (recurso Docker Compose) | Postgres del mismo recurso, volumen propio |
| **Producción** | `main` | Coolify (otro recurso) | Postgres del mismo recurso, volumen propio |

Flujo: `feature/* → dev → test → main`. `feature → dev` y `dev → test` son **merge** directo; solo `test → main` es **PR**. Nunca commit directo a `dev`/`test`/`main`. `dev` se promueve a `test` cuando una tanda está lista para que el cliente la mire; `test` pasa a `main` cuando se aprueba.

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
Ver `docs/DESPLIEGUE-COOLIFY.md` (variables, volúmenes, primer administrador, backups). El seed se niega a correr si `APP_ENV` no es `development` o `test`; en homologación se usa `npm run seed:test` con un `.env.test` propio (gitignored) apuntando a esa base. **Nunca correr `seed:*` contra producción.**
