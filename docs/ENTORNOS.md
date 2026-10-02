# Entornos y flujo de trabajo

## Mapa

| Entorno | Rama | App | Supabase | Archivo de variables |
|---|---|---|---|---|
| **Desarrollo** | `feature/*` → `develop` | `npm run dev` en tu máquina | **Local** (Docker, `npm run db:start`), propio de cada dev | `.env.development` (versionado, claves demo públicas) |
| **Homologación** | `staging` | Vercel (preview estable de `staging`) | Proyecto remoto de pruebas (`kdgjcgtuknexzimnpksz`) | `.env.staging` (gitignored) · Vercel env *Preview/staging* |
| **Producción** | `main` | Vercel (Production) | Proyecto remoto de producción (**a crear**) | `.env.production` (gitignored) · Vercel env *Production* |

Homologación es un espejo de producción: mismo código, mismas migraciones, datos de prueba. **Nunca** se cargan datos reales en homologación ni se corre el seed en producción.

## Flujo de ramas
```
feature/mi-cambio ──PR──▶ develop ──PR──▶ staging ──PR──▶ main
   (local + Supabase local)  (CI)     (homologación)   (producción, con aprobación)
```
- Las features salen de `develop` y vuelven por pull request. Nunca se commitea directo a `develop`, `staging` ni `main`.
- Se promueve siempre en ese orden. Un cambio llega a `main` solo si ya pasó por `staging`.
- Hotfix urgente: `hotfix/*` desde `main` → PR a `main` y luego se baja el cambio a `staging` y `develop`.

## Día a día (desarrollo)
```bash
git switch develop && git pull && git switch -c feature/lo-que-sea
npm run db:start       # Supabase local (migraciones + seed automáticos)
npm run seed:dev       # (opcional) cuentas y cursos de prueba; imprime las contraseñas
npm run dev            # usa .env.development → http://localhost:3000
npm run db:reset       # tirar la base local y rehacerla desde las migraciones
npm run db:stop
```
Para probar contra homologación desde tu máquina: `npm run dev:staging`.

## Cambios en la base
1. Crear una migración **nueva** en `supabase/migrations/` (`NNNN_descripcion.sql`). **Nunca editar una ya aplicada**: se corrige con otra migración.
2. Probarla desde cero: `npm run db:reset`.
3. Se aplica a homologación al mergear a `staging` (workflow `deploy-db.yml`) o a mano con `npm run db:push:staging` (muestra qué va a aplicar y pide confirmación).
4. A producción solo desde `main`, con aprobación del environment `production`.

## Qué hace la CI
- **En cada PR** a `develop`/`staging`/`main`: type-check + build, y levanta un Supabase vacío, aplica todas las migraciones y verifica que **todas las tablas tengan RLS** y que **un registro público no genere perfil**.
- **Al mergear** a `staging` o `main` con cambios en `supabase/migrations/**`: aplica las migraciones al Supabase de ese entorno.

## Configuración que hay que hacer una vez (no se puede desde el código)
**GitHub** (Settings)
- Proteger `main`, `staging` y `develop`: exigir pull request y que pasen los checks `Tipos y build` y `Migraciones desde cero + reglas`; sin push directo.
- *Environments* → crear `staging` y `production`; en `production` activar **Required reviewers**.
- Secrets por environment: `SUPABASE_DB_URL` (conexión directa de cada proyecto).

**Vercel**
- Production Branch = `main`.
- Variables de *Production* → proyecto Supabase de producción. Variables de *Preview* → proyecto de homologación.
- Dominio estable para la rama `staging` (por ejemplo `staging.tudominio.com`), asignado a la rama en *Settings › Domains*.
- Los previews de las ramas `feature/*` usan el Supabase de homologación (no hay backend local en la nube): no probar ahí nada destructivo.

**Supabase (cada proyecto remoto)**
- Authentication › Providers › Email: **desactivar *Allow new users to sign up*** (el desarrollo local ya lo trae desactivado en `supabase/config.toml`).
- Authentication › URL Configuration: *Site URL* del entorno y Redirect URLs `…/auth/confirm` y `…/activar`.
- Authentication › Email Templates: pegar `supabase/templates/invite.html` y `recovery.html`.
- SMTP propio: pendiente hasta tener dominio (ver `SETUP-SUPABASE.md`).

## Qué NO va en git
`.env.staging`, `.env.production`, `.env*.local`, `docs/CUENTAS-HOMOLOGACION.md`. Las claves `service_role` y las contraseñas de base viven solo en esos archivos y en los secrets de GitHub/Vercel.
