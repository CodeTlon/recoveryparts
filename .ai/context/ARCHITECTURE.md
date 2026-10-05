# ARCHITECTURE — Recovery Parts

Versión corta para decidir dónde tocar. Detalle completo, tabla de permisos y modelo de datos: `docs/ARQUITECTURA.md`.

## Capas
Server Components leen con la sesión del usuario (RLS aplica) · Server Actions / Route Handlers escriben y sirven archivos, validando rol con `requireRole()` · `src/middleware.ts` refresca sesión y en `/campus/*` exige sesión, cuenta activa y rol.

## Autorización — tres capas, la real es RLS
1. **Middleware**: sin sesión → `/login`; cuenta no activa → fuera; cada rol solo entra a su `/campus/<rol>`.
2. **`requireRole(...roles)`** (`src/lib/auth.ts`) al inicio de cada página/acción del campus.
3. **RLS** en todas las tablas. Helpers SQL `security definer`: `es_admin()`, `es_profesor_de(curso)`, `alumno_activo_en(curso)`.

Cualquier cambio a esos helpers o a una política necesita re-verificar el caso **anónimo** y el caso **alumno desertor**.

## Clientes Supabase (`src/lib/supabase/`)
| Archivo | Uso |
|---|---|
| `client.ts` | navegador, solo con la anon key |
| `server.ts` | Server Components/Actions con la sesión del usuario |
| `admin.ts` | `service_role`, `import 'server-only'`; solo tras validar rol (invitar, cambiar email, servir PDFs, ZIP) |

## Datos y archivos
- Lectura pública/CMS: `src/lib/data.ts`; vistas públicas con columnas seguras (`cursos_publicos`, `horarios_publicos`, `modulos_publicos`, `kit_publico`).
- Storage: `materiales` (privado, PDFs; el alumno entra por `/api/material/[id]`) y `sitio` (público, imágenes del CMS).
- Mails de Auth: plantillas en `supabase/templates/`; mails de la app en `src/lib/mail.ts`.

## Reglas que viven en la base (no reimplementar en la app)
Cupo, choques de aula/profesor, cupo ≤ capacidad del aula, aulas sin DELETE ni baja con cursos activos, deserción como estado final, inscripción sin DELETE, N° de clase de deserción, perfil solo con `invited_at`, integridad de `materiales` (URL http(s), archivo del propio curso). Desde la 0011 las reglas de dictado son **por edición** (una por vez por curso, fechas dentro del plan e inicio, choques por período). Son triggers/funciones en `supabase/migrations/0002`, `0006`, `0007`, `0008`, `0010` y `0011`. Los mensajes de los triggers de aulas ya son legibles y `traducir()` (admin/actions.ts) los muestra tal cual. Las URLs que se guardan y se renderizan en un `href` pasan por `src/lib/validar.ts`.

## Qué no existe a propósito
Pagos, inscripciones, asistencia, stock, registro público, WhatsApp flotante/bot, videos alojados (solo links), modalidad virtual, carreras.

- Rutas públicas nuevas: `/contacto` (formulario `enviarContacto` + datos de `site_settings.contacto`) y `/preguntas-frecuentes` (`cms_faq`). El catálogo `/cursos` lee `modulos_publicos` para mostrar los módulos en cada tarjeta.
- Los encabezados de seguridad viven en `src/lib/security-headers.ts` (los aplica el middleware): Vercel rechazaba los declarados en `next.config.js`. Los nombres de server actions deben ser ASCII (Next los pone en un encabezado de ruta; la `ñ` rompía el deploy).

- Panel del admin: `/campus/admin` (Resumen) renderiza `components/campus/ReportesPanel.tsx`; `/campus/admin/reportes` solo redirige. `/campus/admin/sitio?tab=…` usa pestañas por query string (mismo patrón que el curso).
