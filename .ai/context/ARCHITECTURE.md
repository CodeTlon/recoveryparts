# ARCHITECTURE — Recovery Parts

Versión corta para decidir dónde tocar. Detalle completo, tabla de permisos y modelo de datos: `docs/ARQUITECTURA.md`.

## Capas
Server Components leen con el rol y usuario de la sesión (RLS aplica) · Server Actions / Route Handlers escriben y sirven archivos, validando rol con `requireRole()` · `src/middleware.ts` (runtime Node) en `/campus/*` exige sesión válida, cuenta activa y rol.

## Autorización — tres capas, la real es RLS
1. **Middleware**: sin sesión → `/login`; cuenta no activa → fuera; cada rol solo entra a su `/campus/<rol>`.
2. **`requireRole(...roles)`** (`src/lib/auth.ts`) al inicio de cada página/acción del campus.
3. **RLS** en todas las tablas. Helpers SQL `security definer`: `es_admin()`, `es_profesor_de(curso)`, `alumno_activo_en(curso)`.

Cualquier cambio a esos helpers o a una política necesita re-verificar el caso **anónimo** y el caso **alumno desertor**.

## Acceso a datos (`src/lib/db/`)
Sin ORM ni Supabase: `builder.ts` ofrece la misma API que se usaba antes (`from().select().eq()…`, `rpc()`), con embeds resueltos por las FK, sobre `postgres.js`. **Cada consulta corre en su transacción con `set_config('role', …)`, `app.role` y `app.user_id`**, así `auth.uid()`/`auth.role()` y las 72 políticas RLS siguen vigentes. Operadores soportados: `eq neq gt gte lt lte is in not`, `buscar([cols], texto)`, `order`, `limit`, `single/maybeSingle`, conteos con `head`, `insert/update/upsert/delete`; lo que falte se agrega en `builder.ts` (lanza error si el select usa una relación ambigua: usar `rel!fk`).
| Función (`src/lib/db/index.ts`) | Uso |
|---|---|
| `clienteAnon()` | sitio público (vistas y tablas con política para `anon`) |
| `clienteUsuario(id)` | lo devuelve `requireRole()` como `sb`; RLS evalúa con ese usuario |
| `clienteAdmin()` / `sqlAdmin()` | `service_role` (sin RLS), `server-only`; solo tras validar rol. `sqlAdmin` toca `auth.users`/`auth.tokens` |

## Autenticación (`src/lib/session.ts`, `src/lib/users.ts`)
Cookie `rp_session` httpOnly con token firmado (HMAC-SHA256, `SESSION_SECRET`), 7 días. En cada request se valida contra la base: cuenta activa, rol y `auth.users.sesion_desde` (cambiar la contraseña cierra las demás sesiones). Contraseñas con scrypt (`password-hash.ts`). Invitación y recuperación: token de un solo uso (`auth.tokens`, solo se guarda el sha256) que abre `/auth/confirm` → `/activar`. **No hay registro público**: el perfil lo crea el trigger de la 0006 solo si `auth.users.invited_at` está seteado, y esa fila solo la inserta el servidor (`invitarUsuario`).

## Datos y archivos
- Lectura pública/CMS: `src/lib/data.ts`; vistas públicas con columnas seguras (`cursos_publicos`, `horarios_publicos`, `modulos_publicos`, `kit_publico`).
- Archivos en disco (`src/lib/storage.ts`, `STORAGE_DIR`): `materiales` (privado, PDFs; el alumno entra por `/api/material/[id]`) y `sitio` (público, fotos/videos del CMS, se sirven por `/media/[...ruta]` con Range). Las subidas del CMS van a `POST /api/media` (solo admin, mismo origen, el tipo se decide por los bytes). Los PDF los guarda `subirPdf`: primero la fila (RLS valida el curso) y después el archivo.
- Mails (invitación, recuperación, avisos, contacto): `src/lib/mail.ts` (SMTP); los links se arman en `src/lib/users.ts`.

## Reglas que viven en la base (no reimplementar en la app)
Cupo, choques de aula/profesor, cupo ≤ capacidad del aula, aulas sin DELETE ni baja con cursos activos, deserción como estado final, inscripción sin DELETE, N° de clase de deserción, perfil solo con `invited_at`, integridad de `materiales` (URL http(s), archivo del propio curso). Desde la 0011 las reglas de dictado son **por edición** (una por vez por curso, fechas dentro del plan e inicio, choques por período). Son triggers/funciones en `db/migrations/0002`, `0006`, `0007`, `0008`, `0010` y `0011`. Los mensajes de los triggers de aulas ya son legibles y `traducir()` (admin/actions.ts) los muestra tal cual. Las URLs que se guardan y se renderizan en un `href` pasan por `src/lib/validar.ts`.

## Qué no existe a propósito
Pagos, inscripciones, asistencia, stock, registro público, WhatsApp flotante/bot, videos alojados (solo links), modalidad virtual, carreras.

- Rutas públicas nuevas: `/contacto` (formulario `enviarContacto` + datos de `site_settings.contacto`) y `/preguntas-frecuentes` (`cms_faq`). El catálogo `/cursos` lee `modulos_publicos` para mostrar los módulos en cada tarjeta.
- Los encabezados de seguridad viven en `src/lib/security-headers.ts` (los aplica el middleware): Vercel rechazaba los declarados en `next.config.js`. Los nombres de server actions deben ser ASCII (Next los pone en un encabezado de ruta; la `ñ` rompía el deploy).

- Panel del admin: `/campus/admin` (Resumen) renderiza `components/campus/ReportesPanel.tsx`; `/campus/admin/reportes` solo redirige. `/campus/admin/sitio?tab=…` usa pestañas por query string (mismo patrón que el curso).
