# Puesta en marcha con Supabase

> Requisitos: Node ≥ 20. Versiones fijadas: `@supabase/supabase-js` 2.100.0 y `@supabase/ssr` 0.9.0 (las nuevas exigen Node 22).

La app está lista para conectarse; solo falta crear el proyecto y cargar las claves.

## 1. Crear el proyecto
1. Entrá a https://supabase.com y creá un proyecto (región São Paulo).
2. En **Project Settings › API** copiá `Project URL`, `anon key` y `service_role key`.
3. Copiá `.env.example` a `.env.staging` (o `.env.production`) y completá los valores; `npm run dev:staging` lo usa. **La `service_role` nunca se commitea ni se usa en el cliente.**

## 2. Correr las migraciones
Con la CLI (`npm i -g supabase`):
```bash
supabase link --project-ref <tu-ref>
supabase db push
```
O pegando en **SQL Editor**, en orden: `supabase/migrations/0001_schema.sql`, `0002_functions.sql`, `0003_rls.sql`, `0004_storage.sql`, `0005_bloquear_autoregistro.sql`, `0006_perfil_solo_por_invitacion.sql` (la 0006 reemplaza el trigger de la 0005) y por último `supabase/seed.sql`.

## 3. Configurar Auth
En **Authentication**:
- **Providers › Email**: desactivá *Allow new users to sign up* (no hay autorregistro; solo el admin invita). Aunque quede habilitado, la migración `0006` hace que solo las invitaciones generen perfil (un registro público queda sin perfil ni acceso). Activá *Leaked password protection* y largo mínimo 8.
- **URL Configuration**: *Site URL* = tu dominio. En *Redirect URLs* agregá `<dominio>/auth/confirm` y `<dominio>/activar`.
- **Email Templates** (Invite user y Reset password): apuntá el botón a
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite` (invitación) y `...&type=recovery` (reset). Así el token se valida en el servidor y sale de la URL.
- **Expiración**: invitación 24 h (*Auth › Providers › Email › Email OTP Expiration* = 86400) y reset 10 min. Si tu plan solo permite un valor global, usá 24 h y mantené el límite de 10 min en el texto del mail de reset.
- **SMTP propio** (*Project Settings › Auth › SMTP*) con SPF, DKIM y DMARC en el dominio remitente. El SMTP por defecto de Supabase no sirve para producción.
- **Sessions**: definí *time-box* e *inactivity timeout*. Las cookies son `httpOnly`/`secure`/`SameSite=Lax` (las maneja `@supabase/ssr`).

## 4. Primer administrador
1. **Authentication › Users › Invite user** con tu email. Tiene que ser una *invitación*: los usuarios creados con «Add user» no pasan el bloqueo de autorregistro.
2. En **SQL Editor**:
   ```sql
   update profiles set rol = 'admin', estado_cuenta = 'activa', nombre = 'Tu', apellido = 'Nombre' where email = 'tu@email.com';
   ```
3. Ingresá en `/login`. Desde **Campus › Usuarios** creás profesores y alumnos.

## 5. Mails
- Invitaciones y reset: los envía Supabase Auth.
- Avisos propios (alumno existente sumado a un curso, clases suspendidas): SMTP definido en `.env.local` (`SMTP_*`, `MAIL_FROM`).
- Aviso de nueva consulta del formulario de contacto: creá un **Database Webhook** en la tabla `contactos` (INSERT) hacia una Edge Function o servicio de mail. La consulta ya queda visible en **Campus › Consultas**.

## 6. Carga de contenido
En **Campus › Sitio web** cargás portada, áreas, nosotros, stats, contacto, egresados, testimonios, FAQ y galería. Las imágenes se suben ahí y se pegan por URL. Antes de publicar fotos de alumnos o egresados, conseguí su consentimiento de uso de imagen. Los precios y el kit son de referencia (la venta y el cobro se hacen en el software externo).

## 7. Decisiones pendientes (spec §D)
- Entrada directa del alumno con un solo curso (RF-11): se activa/desactiva desde **Sitio web**.
- Avisos por WhatsApp (RF-38/40): fuera por ahora; los avisos van por mail.
- Qué pasa con los PDFs/ZIP de cursos viejos al darlos de baja: hoy el ZIP deja de estar disponible cuando el curso se da de baja.

## 8. Antes de pasar a producción
- Rotar la contraseña de la base y las claves `anon`/`service_role` si se compartieron por chat.
- Crear un proyecto de producción **sin** correr `scripts/seed-pruebas.mjs` (solo crea datos de prueba y exige `--confirmo-homologacion`).
- Desactivar *Allow new users to sign up* en Auth y configurar SMTP propio con SPF/DKIM/DMARC.
- Cargar el contenido real desde Campus › Sitio web (imágenes limpias y con consentimiento de uso de imagen).
