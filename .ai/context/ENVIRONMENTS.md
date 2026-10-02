# ENVIRONMENTS — Recovery Parts

Detalle y flujo de ramas: `docs/ENTORNOS.md`. Acá, lo mínimo para no equivocarse.

| Entorno | Rama | Supabase | Variables |
|---|---|---|---|
| Desarrollo | `feature/*` → `dev` | local (Docker, `project_id = recoveryparts-dev`) | `.env.development` (versionado, claves demo) |
| Homologación | `test` | remoto de pruebas | `.env.test` (gitignored) |
| Producción | `main` | remoto de producción (**a crear**) | `.env.production` (gitignored) |

- Migraciones: `npm run db:push:test` / `db:push:production` piden confirmación; el workflow `deploy-db.yml` las aplica al mergear a `test`/`main`.
- Seed: `npm run seed:dev` / `seed-pruebas.mjs` con `ENV_FILE`; se niega a correr si `APP_ENV` no es `development`/`test`. **Nunca contra producción.**
- Cuentas de prueba de homologación: `docs/CUENTAS-HOMOLOGACION.md` (gitignored, dominio `@homologacion.example.com`).
- Setup de Supabase remoto, SMTP y plantillas de Auth: `docs/SETUP-SUPABASE.md`.
- La CI (`.github/workflows/ci.yml`) corre `type-check`, `build`, migraciones desde cero, y verifica que todas las tablas tengan RLS y que un signUp público no genere perfil.
