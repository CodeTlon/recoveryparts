# Despliegue en Coolify — paso a paso

Se despliegan **dos recursos independientes** (homologación y producción). Cada uno es un *Docker Compose* con su propio Postgres, su propio volumen de archivos y su propio dominio. Las migraciones se aplican solas cada vez que arranca la app.

| | Homologación | Producción |
|---|---|---|
| Rama | `test` | `main` |
| Dominio (ejemplo) | `test.tu-dominio.com` | `tu-dominio.com` |
| `APP_ENV` | `test` | `production` |

> Los nombres de menú de Coolify cambian entre versiones; si algo no está donde dice acá, buscá la opción por su nombre.

---

## 0. Antes de empezar
- [ ] Un servidor con Coolify funcionando y acceso al panel.
- [ ] Dos (sub)dominios apuntando por DNS (registro A) a la IP del servidor.
- [ ] Una cuenta SMTP para el mail saliente (host, puerto, usuario, clave y una casilla remitente). **Sin SMTP no llegan invitaciones ni recuperaciones de contraseña.**
- [ ] El repo `CodeTlon/recoveryparts` es privado: Coolify necesita acceso (paso 1).
- [ ] Si el repo estaba conectado a Vercel, desconectalo para que no intente desplegar cada push.

## 1. Dar acceso al repo a Coolify
1. *Sources › + Add* y creá una **GitHub App** (o, más simple, usá *Private Repository (with Deploy Key)* al crear el recurso y agregá la clave pública que te muestra Coolify en *GitHub › repo › Settings › Deploy keys*).
2. Instalá la app solo sobre el repo `recoveryparts`.

## 2. Generar los secretos (una vez por entorno, en tu máquina)
```bash
openssl rand -base64 48   # → SESSION_SECRET
openssl rand -base64 32   # → POSTGRES_PASSWORD
```
Guardalos en tu gestor de contraseñas. **Usá valores distintos en homologación y en producción.**

## 3. Crear el recurso de homologación
1. *Projects › + Add* → nombre `Recovery Parts`. Dentro, usá un *Environment* para `test` y otro para `production`.
2. En el entorno `test`: *+ New Resource › Docker Compose* (desde repositorio Git).
3. Elegí el repo, **rama `test`**, *Base Directory* `/`, *Docker Compose Location* `/docker-compose.yml`.
4. Guardá. Coolify lee el compose y muestra los servicios `db` y `app`.

## 4. Variables de entorno
En *Environment Variables* del recurso cargá:

| Variable | Valor | Obligatoria |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://test.tu-dominio.com` (sin barra final) | sí |
| `SESSION_SECRET` | el de `openssl rand -base64 48` (32+ caracteres) | sí |
| `POSTGRES_PASSWORD` | el de `openssl rand -base64 32` | sí |
| `APP_ENV` | `test` (en producción: `production`) | sí |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | los de tu proveedor | sí para invitar |
| `POSTGRES_USER`, `POSTGRES_DB` | si no los definís: `postgres` / `recoveryparts` | no |

- Marcá `NEXT_PUBLIC_SITE_URL` también como variable de **build** (*Build Variable*): se usa en el sitemap y en los metadatos.
- La app **no arranca** si falta `SESSION_SECRET` (mínimo 32 caracteres) o `NEXT_PUBLIC_SITE_URL`: el log lo dice.

## 5. Dominio y puerto
1. Abrí el servicio **app** y en *Domains* poné `https://test.tu-dominio.com:3000` (el `:3000` le indica a Coolify el puerto interno).
2. El servicio **db** no lleva dominio: solo lo usa la app por la red interna del compose.
3. Coolify pide el certificado a Let's Encrypt cuando el DNS ya apunta al servidor.

## 6. Desplegar y verificar
1. *Deploy*. La primera vez tarda unos minutos (build de la imagen).
2. En los logs de **app** tenés que ver, en este orden:
   - `✔ 0001_schema.sql` … `✔ 0016_sin_supabase.sql` y `Base al día.`
   - `✓ Ready`
3. Comprobá:
   - `https://test.tu-dominio.com/api/health` → `{"ok":true}`
   - la home y `/cursos` cargan (vacías, sin datos todavía);
   - `/campus` te manda a `/login`.

## 7. Crear el primer administrador
En el recurso, servicio **app** → *Terminal* (o `docker exec -it <contenedor-app> sh` por SSH):
```sh
ADMIN_PASSWORD='una-clave-larga-y-unica' node scripts/crear-admin.mjs tu@email.com Nombre Apellido
```
Entrá en `/login`. Desde **Campus › Usuarios** invitás a profesores y alumnos (la invitación sale por SMTP y el link usa `NEXT_PUBLIC_SITE_URL`). Correr el script otra vez con el mismo email resetea la clave de ese admin.

> El seed de pruebas **no** está en la imagen a propósito. En homologación cargá los cursos desde el campus; si necesitás los datos de prueba, abrí un túnel SSH a la base y corré `npm run seed:test` desde tu máquina con un `.env.test` propio.

## 8. Checklist de aceptación (homologación)
- [ ] `/api/health` da 200.
- [ ] Login del admin y acceso a `/campus/admin`.
- [ ] Crear un curso y subirle una foto (verifica el volumen `storage`).
- [ ] Invitar a un alumno con un mail real: llega, el link abre `/activar` con **tu dominio** (no `localhost`) y se puede definir la contraseña.
- [ ] «¿Olvidaste tu contraseña?» envía el mail y el link funciona una sola vez.
- [ ] Subir un PDF como profesor y verlo como alumno inscripto (y que otro alumno no lo vea).
- [ ] Reiniciar el recurso desde Coolify: los datos y los archivos siguen ahí.

## 9. Producción
Repetí los pasos 2 a 8 en el entorno `production` con: **rama `main`**, dominio de producción, `APP_ENV=production` y **secretos nuevos y distintos**. Nunca corras `seed:*` contra producción.

## 10. Despliegue automático
En cada recurso: *Webhooks › GitHub* (o activá *Auto Deploy* si usás la GitHub App). Con eso, un push a `test` redeploya homologación y uno a `main` redeploya producción. Las migraciones nuevas se aplican solas antes de arrancar.

## 11. Backups (no los omitas)
Coolify no hace backup automático de una base definida dentro de un Docker Compose. Hacelo con cron en el servidor, dos veces al día:
```bash
# Base de datos (ajustá el nombre del contenedor: docker ps | grep db)
docker exec <contenedor-db> pg_dump -U postgres -Fc recoveryparts > /backups/rp-$(date +%F-%H%M).dump
# Archivos subidos (PDFs, fotos, videos): el volumen "storage" del recurso
docker run --rm -v <volumen-storage>:/data -v /backups:/out alpine tar czf /out/rp-storage-$(date +%F).tgz -C /data .
```
Copiá `/backups` fuera del servidor (rclone/S3) y **probá restaurar una vez**: `pg_restore -U postgres -d recoveryparts --clean <archivo.dump>`.

## 12. Actualizar, revertir y migraciones
- **Actualizar:** flujo normal `feature/* → dev → test → main`. Un push a la rama del entorno redeploya.
- **Revertir código:** *Deployments* → redeploy de un commit anterior.
- **Migraciones:** son hacia adelante. Para deshacer un cambio de esquema se agrega una migración nueva (nunca se edita una ya aplicada).

## 13. Problemas frecuentes
| Síntoma | Causa y arreglo |
|---|---|
| El contenedor `app` se reinicia con `Falta SESSION_SECRET` / `Falta NEXT_PUBLIC_SITE_URL` | Falta la variable (o tiene menos de 32 caracteres). Cargala y redeployá. |
| `502 Bad Gateway` | El dominio no tiene `:3000`, o la app todavía está arrancando (mirá el healthcheck). |
| Los links de invitación apuntan a `localhost` | Falta `NEXT_PUBLIC_SITE_URL`. Corregila y redeployá (también como Build Variable). |
| «No se pudo enviar la invitación» o nadie recibe mails | SMTP mal configurado; el alta queda hecha pero sin mail. Probá el SMTP y reenviá desde Usuarios. |
| `Error aplicando migraciones: …` al arrancar | Mirá el mensaje en el log. Con `POSTGRES_PASSWORD` cambiada después del primer arranque, el volumen conserva la clave vieja: restaurala o recreá el volumen (solo si no hay datos). |
| Logueás pero volvés a `/login?error=cuenta` | La cuenta no está activa. Con `crear-admin.mjs` queda activa; a los invitados los activa el link del mail. |

## 14. Limitaciones conocidas
- **Una sola réplica de la app**: el límite de intentos de login vive en memoria del proceso.
- La app se conecta con el mismo usuario de Postgres que migra y cambia de rol con `SET LOCAL ROLE` en cada consulta (RLS sigue vigente). Endurecimiento pendiente: un usuario de conexión sin privilegios de superusuario.
- Las sesiones son cookies firmadas: no se revocan de a una (cambiar la contraseña o desactivar la cuenta las corta). Cambiar `SESSION_SECRET` cierra todas.
