# Despliegue en Coolify

La app se despliega como **Docker Compose** (`docker-compose.yml`): un Postgres 16 y la app Next.js. Las migraciones (`db/migrations`) se aplican solas cada vez que arranca la app (`docker-entrypoint.sh`), así que no hay paso aparte para la base.

## 1. Crear el recurso
1. En Coolify: *New Resource › Docker Compose* apuntando al repo, rama `test` (homologación) o `main` (producción). Un recurso por entorno.
2. Dominio: asignalo al servicio **app** (puerto 3000). Coolify emite el certificado.
3. Activá el despliegue automático por webhook de GitHub si querés que cada push a la rama redeploye.

## 2. Variables de entorno (panel de Coolify)
| Variable | Valor |
|---|---|
| `SESSION_SECRET` | 32+ caracteres al azar: `openssl rand -base64 48`. Cambiarla cierra todas las sesiones. |
| `NEXT_PUBLIC_SITE_URL` | `https://tu-dominio.com` (la usan los links de invitación y recuperación). |
| `POSTGRES_PASSWORD` | contraseña larga y única (la app se conecta con ella por la red interna). |
| `POSTGRES_USER`, `POSTGRES_DB` | opcionales (por defecto `postgres` / `recoveryparts`). |
| `APP_ENV` | `test` o `production`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | mail saliente (invitaciones, reset, avisos). Sin SMTP la app no envía nada: configuralo antes de invitar a alguien. |

La app no arranca si falta `SESSION_SECRET` (mínimo 32 caracteres) o `NEXT_PUBLIC_SITE_URL`.

## 3. Volúmenes
- `db_data`: datos de Postgres.
- `storage`: PDFs y fotos/videos (`/data/storage`). **Los dos tienen que ser persistentes** y entrar en el backup.

## 4. Primer administrador
Sin datos ni registro público, el primer admin se crea desde la terminal del servicio **app** en Coolify:
```sh
ADMIN_PASSWORD='una-clave-larga-y-unica' node scripts/crear-admin.mjs tu@email.com Nombre Apellido
```
Ingresás en `/login` con ese email y esa contraseña. Desde **Campus › Usuarios** invitás a profesores y alumnos (la invitación llega por mail: antes configurá el SMTP). Correrlo de nuevo con un email existente resetea la contraseña de ese admin.

## 5. Healthcheck, logs y backups
- `GET /api/health` responde 200 solo si la base contesta (lo usa el healthcheck del compose).
- Backups: programá el backup de Postgres de Coolify (o `pg_dump`) y el del volumen `storage`.
- Para ver o correr SQL a mano: terminal del contenedor `db` → `psql -U $POSTGRES_USER $POSTGRES_DB`.

## 6. Limitaciones conocidas
- **Una sola réplica de la app.** El límite de intentos de login/reset está en memoria del proceso (`src/lib/rate-limit.ts`); con más réplicas se reparte.
- La app usa el mismo usuario de Postgres que las migraciones y cambia de rol con `SET LOCAL ROLE` en cada consulta (RLS sigue vigente). Endurecimiento pendiente: un usuario de conexión sin privilegios de superusuario para la app.
- Nunca correr `seed:*` contra producción (el script se niega si `APP_ENV` no es development/test).
