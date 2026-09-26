# ARCHITECTURE.md — Recovery Parts

> Mapa técnico detallado. Para contexto general y reglas del proyecto ver `AGENTS.md`. Para el alcance funcional completo (RF-01 a RF-57) ver `docs/ESPECIFICACION.md`.

## Para cambios comunes, leé solo

| Querés tocar | Leé solo |
|---|---|
| Sitio público (home/galería/cursos) | Este archivo → "Rutas públicas" + tablas `cursos`/`galeria_fotos`/`testimonios`/`faq` |
| Login / invitaciones / recuperar contraseña | "Auth y RLS" abajo + Bug 35 y Bug 31 de `bugs.md` de la fábrica |
| Campus de un rol específico | "Rutas del campus" + la tabla correspondiente en "Esquema de datos" |
| RLS / permisos | "Esquema de datos" (columna RLS de cada tabla) + `security-owasp.md` de la fábrica |

## Estructura de carpetas

Auth (B0/B1) ya implementada — resto sigue siendo objetivo, se completa en los bloques que faltan (ver `TASKS.md`).

```
src/
├── app/
│   ├── (public)/                     # objetivo — hoy sigue en app/page.tsx, app/curso/page.tsx sueltos
│   │   ├── page.tsx                  # Home (A1)
│   │   ├── galeria/page.tsx          # A2
│   │   ├── cursos/page.tsx           # A3 — listado dinámico
│   │   └── cursos/[slug]/page.tsx    # A4 — detalle dinámico
│   ├── login/page.tsx                # ✅ real — useFormState + loginAction
│   ├── activar/page.tsx              # ✅ client component — parsea hash de invite (Bug 35)
│   ├── recuperar/page.tsx            # ✅ solicita reset (PKCE)
│   ├── recuperar/nueva-clave/page.tsx  # ✅ setea la nueva contraseña
│   ├── auth/confirm/route.ts         # ✅ exchange de `?code=` (PKCE) — SOLO ese flujo, ver AGENTS.md quirks
│   └── (campus)/
│       ├── alumno/layout.tsx         # ✅ gate: requireAlumno()
│       ├── alumno/page.tsx           # ✅ placeholder — crece con Cursos (B3)
│       ├── profesor/layout.tsx       # ✅ gate: requireProfesor()
│       ├── profesor/page.tsx         # ✅ placeholder
│       ├── admin/layout.tsx          # ✅ gate: requireAdmin()
│       ├── admin/page.tsx            # ✅ KPI mínimo (total usuarios)
│       └── admin/usuarios/page.tsx   # ✅ invitar + listar usuarios
├── components/
│   ├── layout/         # SiteNav, SiteFooter, WhatsAppButton (ya existían, reusados)
│   └── campus/          # ✅ CampusShell.tsx (sidebar+drawer genérico), InvitarUsuarioForm.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # ✅ browser client
│   │   ├── server.ts    # ✅ server client (cookies)
│   │   ├── admin.ts      # ✅ service_role, SOLO en Server Actions
│   │   └── middleware.ts # ✅ updateSession — usado por src/middleware.ts
│   ├── actions/
│   │   ├── auth.ts        # ✅ loginAction / logoutAction / recuperarSolicitarAction / recuperarActualizarAction
│   │   └── usuarios.ts     # ✅ invitarUsuarioAction (admin-only)
│   ├── auth-helpers.ts   # ✅ getUserAndProfile / requireAlumno / requireProfesor / requireAdmin
│   ├── rate-limit.ts      # ✅ limitador en memoria (login, recuperar)
│   ├── site-url.ts        # ✅ siteUrl() + safeNextPath() (allowlist de redirects)
│   └── validations/       # objetivo — hoy los schemas Zod viven inline en cada action
└── middleware.ts          # ✅ protege (campus)/*, revalida sesión — Next 15 clásico (no `proxy.ts`, eso es Next 16+)
```

## Rutas públicas

`/`, `/galeria`, `/cursos`, `/cursos/[slug]` — SSR con datos de `cursos`/`galeria_fotos`/`testimonios`/`faq`. `generateStaticParams` de `/cursos/[slug]` con try/catch (build sin credenciales — Bug 24 de la fábrica). SEO: `sitemap.ts` + `robots.ts` obligatorios (agente `seo-specialist`).

## Rutas del campus

Route groups `(campus)/alumno`, `(campus)/profesor`, `(campus)/admin`, cada uno con `layout.tsx` que llama al helper `require<Rol>()` (patrón `vimet`: redirige a `/login` si no hay sesión, redirige al home del rol correcto si el rol no matchea).

## Auth y RLS

**Alta de usuario (B0.1, solo Admin):**
1. Admin crea curso/alumno/profesor desde `(campus)/admin`.
2. Si el email del profesor/alumno no existe en `profiles` → Server Action con `service_role` llama `supabase.auth.admin.inviteUserByEmail(email, { data: { rol: 'profesor' | 'alumno' } })`.
3. Trigger `handle_new_user` en `auth.users` (`AFTER INSERT`) lee `raw_user_meta_data->>'rol'` y crea la fila en `profiles`.
4. El invite usa **implicit flow**: el link redirige a `/activar#access_token=...&type=invite`. `/activar` es un **client component** que parsea `window.location.hash` con `URLSearchParams` y llama `supabase.auth.setSession()` explícito — **nunca** un Route Handler (los tokens van en el hash, el servidor no los ve). Ver Bug 35 de `bugs.md`.
5. Reset de contraseña (`/recuperar`) usa `resetPasswordForEmail` — **PKCE flow** (`?code=`), distinto del anterior — ver mismo Bug 35 para no confundir los dos flujos.

**Revalidación de sesión:** siempre `supabase.auth.getUser()` en Server Components/Server Actions/Route Handlers, nunca `getSession()` (Bug 31 — rotación de refresh token puede desloguear si middleware y RSC llaman `getUser()` por separado sin cuidado; centralizar en `lib/supabase/server.ts`).

**Anti-escalación de privilegios:** trigger `BEFORE UPDATE` en `profiles` que bloquea que un usuario no-admin cambie su propio `rol` o `cuenta_activa`. Cuidado: cualquier función/trigger que chequee `is_admin()` sin `OR auth.uid() IS NULL` bloquea en silencio los updates hechos con el cliente `service_role` (gotcha documentado en `vimet`).

## Esquema de datos (diseño — se crea en FASE 6 vía `supabase/migrations/*.sql`)

Helpers SQL reusados en RLS (patrón `vimet`): `is_admin()`, `is_profesor()`.

| Tabla | Campos clave | RLS |
|---|---|---|
| `profiles` | `id` (FK `auth.users`), `nombre`, `telefono`, `rol` (`alumno`\|`profesor`\|`administrador`), `cuenta_activa` | select propio + admin todos · update propio (campos limitados, trigger anti-escalación) + admin todos |
| `cursos` | `id`, `slug`, `titulo`, `descripcion`, `modalidad`, `dias_horario`, `aula`, `profesor_id` (FK profiles), `cupo_total`, `precio_display`, `kit_items` (jsonb: `{nombre, precio_ref, link_externo}[]`), `temario` (jsonb o tabla `curso_modulos`), `estado` | select público (`true`) · insert/update/delete solo admin |
| `matriculas` | `id`, `alumno_id` (FK profiles), `curso_id` (FK cursos), `estado` (`activo`\|`suspendido`\|`desertor`\|`inactivo`), `motivo_baja` (obligatorio si desertor/inactivo — RF-55), `fecha_inicio`, `fecha_fin`, `created_by` | select alumno propio + profesor del curso + admin · insert/update solo admin |
| `materiales` | `id`, `curso_id`, `titulo`, `tipo` (`pdf`\|`video_link`), `url`, `liberado_en` (timestamptz nullable), `orden` | select alumnos matriculados en ese curso + profesor dueño + admin · insert/update/delete profesor dueño + admin |
| `galeria_fotos` | `id`, `url`, `categoria` (`egresados`\|`eventos`), `alt`, `orden`, `publicado` | select público si `publicado` · mutación solo admin |
| `testimonios`, `faq` | contenido + `publicado`, `orden` | select público si `publicado` · mutación solo admin |
| `encuestas_fin_curso` / `respuestas_encuesta` | RF-47 — pregunta(s) + respuesta por alumno/matrícula | select/insert propio alumno + admin lectura |

**Cupos (B4):** se derivan en runtime (`cupo_total - count(matriculas activas)` del curso), no se gestionan como contador separado que pueda desincronizarse — calcular en el server (route handler/Server Component), nunca en el cliente.

## Fuera de alcance (no implementar)

Pagos/cobros, inscripción transaccional (el alta de `matriculas` la hace el Admin manualmente tras inscripción externa), asistencia desde celular, cursos virtuales, carreras (agrupación multi-curso). Ver `docs/ESPECIFICACION.md` sección C para el detalle completo.
