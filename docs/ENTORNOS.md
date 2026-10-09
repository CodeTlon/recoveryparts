# Entornos y flujo de trabajo

## Mapa

| Entorno | Rama | App | Supabase | Archivo de variables |
|---|---|---|---|---|
| **Desarrollo** | `feature/*` → `dev` | `npm run dev` en tu máquina | **Local** (Docker, `npm run db:start`), propio de cada dev | `.env.development` (versionado, claves demo públicas) |
| **Homologación** | `test` | Vercel (preview estable de `test`) | Proyecto remoto de pruebas (`kdgjcgtuknexzimnpksz`) | `.env.test` (gitignored) · Vercel env *Preview/test* |
| **Producción** | `main` | Vercel (Production) | Proyecto remoto de producción (**a crear**) | `.env.production` (gitignored) · Vercel env *Production* |

Homologación es un espejo de producción: mismo código, mismas migraciones, datos de prueba. **Nunca** se cargan datos reales en homologación ni se corre el seed en producción.

## Flujo de ramas
```
feature/mi-cambio ──merge──▶ dev ──merge──▶ test ──PR──▶ main
   (local + Supabase local)  (CI)     (homologación)   (producción, con aprobación)
```
- Las features salen de `dev` y vuelven a `dev` por **merge**; `dev` se lleva a `test` también por **merge**. El **único pull request** es de `test` a `main` (producción, con aprobación). Nunca se commitea directo a `dev`, `test` ni `main`: se llega siempre por merge de una rama.
- Se promueve siempre en ese orden. Un cambio llega a `main` solo si ya pasó por `test`.
- Hotfix urgente: `hotfix/*` desde `main` → PR a `main` y luego se baja el cambio a `test` y `dev`.

## Día a día (desarrollo)
```bash
git switch dev && git pull && git switch -c feature/lo-que-sea
npm run db:start       # Supabase local (migraciones + seed automáticos)
npm run seed:dev       # (opcional) cuentas y cursos de prueba; imprime las contraseñas
npm run dev            # usa .env.development → http://localhost:3000
npm run db:reset       # tirar la base local y rehacerla desde las migraciones
npm run db:stop
```
Para probar contra homologación desde tu máquina: `npm run dev:test`.

## Cambios en la base
1. Crear una migración **nueva** en `supabase/migrations/` (`NNNN_descripcion.sql`). **Nunca editar una ya aplicada**: se corrige con otra migración.
2. Probarla desde cero: `npm run db:reset`.
3. Se aplica a homologación al mergear a `test` (workflow `deploy-db.yml`) o a mano con `npm run db:push:test` (muestra qué va a aplicar y pide confirmación).
4. A producción solo desde `main`, con aprobación del environment `production`.

### Aplicar migraciones a mano en homologación (mientras falte el secreto del workflow)
Homologación es la base de la demo del cliente, que corre `main`. Si una migración cambia columnas que usa el código desplegado, la demo se rompe hasta que el código nuevo llega. Orden:

1. **Probarla con datos**, no solo desde cero: `db:reset` aplica sobre una base vacía y no detecta, por ejemplo, un `ALTER TABLE` después de un `UPDATE` que dispara triggers diferidos (le pasó a la 0013). Dejar la base local en la versión de homologación, cargar el seed de esa versión y correr el script encima.
2. **Chequeo previo** en el SQL Editor (solo lectura): `select max(version) from supabase_migrations.schema_migrations;` y las consultas que la migración necesite (datos que la harían fallar).
3. **Primero el código**: mergear el PR `test → main` y **esperar a que termine el deploy** de Vercel.
4. **Enseguida, las migraciones**: cada una en su **propia ejecución** del SQL Editor y en orden, envuelta así:
   ```sql
   begin;
   -- contenido de supabase/migrations/NNNN_nombre.sql
   insert into supabase_migrations.schema_migrations (version, name) values ('NNNN', 'nombre');
   commit;
   ```
   Si falla, se deshace entera. Un `alter type … add value` va solo y confirmado antes de la migración que usa el valor nuevo.
5. Entre el paso 3 y el 4 la demo puede fallar: hacerlos seguidos. Comprobar el sitio y el campus al terminar.

## Qué hace la CI
- **En cada PR** a `dev`/`test`/`main`: type-check + build, y levanta un Supabase vacío, aplica todas las migraciones y verifica que **todas las tablas tengan RLS** y que **un registro público no genere perfil**.
- **Al mergear** a `test` o `main` con cambios en `supabase/migrations/**`: aplica las migraciones al Supabase de ese entorno.

## Configuración que hay que hacer una vez (no se puede desde el código)
**GitHub** (Settings)
- Proteger `main`, `test` y `dev`: en `main` exigir pull request, y en `test` y `dev` exigir que pasen los checks `Tipos y build` y `Migraciones desde cero + reglas`; sin push directo.
- *Environments* → crear `test` y `production`; en `production` activar **Required reviewers**.
- Secrets por environment: `SUPABASE_DB_URL` (conexión directa de cada proyecto).

**Vercel**
- Production Branch = `main`.
- Variables de *Production* → proyecto Supabase de producción. Variables de *Preview* → proyecto de homologación.
- Dominio estable para la rama `test` (por ejemplo `test.tudominio.com`), asignado a la rama en *Settings › Domains*.
- Los previews de las ramas `feature/*` usan el Supabase de homologación (no hay backend local en la nube): no probar ahí nada destructivo.

**Supabase (cada proyecto remoto)**
- Authentication › Providers › Email: **desactivar *Allow new users to sign up*** (el desarrollo local ya lo trae desactivado en `supabase/config.toml`).
- Authentication › URL Configuration: *Site URL* del entorno y Redirect URLs `…/auth/confirm` y `…/activar`.
- Authentication › Email Templates: pegar `supabase/templates/invite.html` y `recovery.html`.
- SMTP propio: pendiente hasta tener dominio (ver `SETUP-SUPABASE.md`).

## Qué NO va en git
`.env.test`, `.env.production`, `.env*.local`, `docs/CUENTAS-HOMOLOGACION.md`. Las claves `service_role` y las contraseñas de base viven solo en esos archivos y en los secrets de GitHub/Vercel.
