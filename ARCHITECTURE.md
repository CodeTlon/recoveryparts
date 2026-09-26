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

Auth (B0/B1) + Cursos/Alumnos/Cupos/Material (B2-B5) implementados. Falta: Kit editor
(B6/B7 — la columna existe, no el form), Encuestas (B8), Reportes (B9) y todo el
Sitio público + CMS (A1-A4) — ver `TASKS.md` para el detalle vivo.

```
src/
├── app/
│   ├── (public)/                     # objetivo — hoy sigue en app/page.tsx, app/curso/page.tsx sueltos (sin tocar en este bloque)
│   │   ├── page.tsx                  # Home (A1)
│   │   ├── galeria/page.tsx          # A2
│   │   ├── cursos/page.tsx           # A3 — listado dinámico, con búsqueda/filtros
│   │   └── cursos/[slug]/page.tsx    # A4 — detalle dinámico
│   ├── login/page.tsx                # ✅ real — useFormState + loginAction
│   ├── activar/page.tsx              # ✅ client component — parsea hash de invite (Bug 35)
│   ├── recuperar/page.tsx            # ✅ solicita reset (PKCE)
│   ├── recuperar/nueva-clave/page.tsx  # ✅ setea la nueva contraseña, invalida el resto de sesiones
│   ├── auth/confirm/route.ts         # ✅ exchange de `?code=` (PKCE) — SOLO ese flujo, ver AGENTS.md quirks
│   └── (campus)/
│       ├── alumno/layout.tsx         # ✅ gate: requireAlumno()
│       ├── alumno/page.tsx           # ✅ "mis cursos" — si hay 1 solo activo, redirige directo (RF-11)
│       ├── alumno/cursos/[id]/page.tsx # ✅ próxima clase (solo título, RF-37) + material liberado
│       ├── profesor/layout.tsx       # ✅ gate: requireProfesor()
│       ├── profesor/page.tsx         # ✅ "mis cursos" reales
│       ├── profesor/cursos/[id]/page.tsx # ✅ alumnos + marcar deserción + temario/calendario + material
│       ├── admin/layout.tsx          # ✅ gate: requireAdmin()
│       ├── admin/page.tsx            # ✅ KPI mínimo (total usuarios)
│       ├── admin/usuarios/page.tsx   # ✅ invitar + listar + activar/desactivar cuenta (RF-56)
│       ├── admin/cursos/page.tsx     # ✅ listado
│       ├── admin/cursos/nuevo/page.tsx # ✅ alta (genera el calendario de clases)
│       └── admin/cursos/[id]/page.tsx  # ✅ edición + matricular alumnos + cambiar estado de matrícula
├── components/
│   ├── layout/         # SiteNav, SiteFooter, WhatsAppButton (ya existían, reusados)
│   └── campus/          # ✅ CampusShell, InvitarUsuarioForm, CursoForm, AgregarAlumnoForm,
│                        #    MatriculaEstadoForm, ClaseRow, MaterialManager
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # ✅ browser client
│   │   ├── server.ts    # ✅ server client (cookies)
│   │   ├── admin.ts      # ✅ service_role, SOLO en Server Actions
│   │   └── middleware.ts # ✅ updateSession — usado por src/middleware.ts
│   ├── actions/
│   │   ├── auth.ts        # ✅ login/logout/recuperar (invalida sesiones al cambiar clave)
│   │   ├── usuarios.ts     # ✅ invitar + toggleCuentaActiva (admin-only)
│   │   ├── cursos.ts       # ✅ crear/editar (valida superposición aula+profesor) + dar de baja
│   │   ├── matriculas.ts   # ✅ agregar alumno a curso (reusa o invita) + cambiar estado (deserción con n_clase)
│   │   ├── clases.ts       # ✅ editar tema + suspender/reprogramar clase
│   │   └── material.ts     # ✅ subir/liberar/eliminar material
│   ├── auth-helpers.ts   # ✅ getUserAndProfile / requireAlumno / requireProfesor / requireAdmin / nombreCompleto
│   ├── rate-limit.ts      # ✅ limitador en memoria (login, recuperar — por IP y por email)
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

## Esquema de datos

Helpers SQL reusados en RLS (patrón `vimet`): `is_admin()`, `is_profesor()`, `horarios_se_superponen()`.
Migraciones: `0001_auth_profiles.sql` (auth) · `0002_cursos_matriculas.sql` (cursos+clases+matriculas,
en un solo archivo porque sus RLS se referencian cruzadas) · `0003_material.sql`.

| Tabla | Campos clave | RLS |
|---|---|---|
| `profiles` | `id` (FK `auth.users`), `nombre`, `apellido`, `telefono`, `email`, `rol` (`alumno`\|`profesor`\|`administrador`), `cuenta_activa`, `bio`/`foto_url` (mini-CV de profesor, RF-25) | select propio + admin todos · update propio (campos limitados, trigger anti-escalación) + admin todos |
| `cursos` | `id`, `slug`, `titulo`, `tipo` (`curso`\|`taller`), `area` (`tecnico`\|`diseno`), `descripcion`, `requisitos`, `temario` (jsonb `{titulo,descripcion}[]`), `imagenes[]`, `video_url`, `dias_semana` (smallint[]), `hora_inicio`/`hora_fin`, `aula`, `fecha_inicio`, `duracion_semanas`, `profesor_id` (FK profiles), `cupo_total`, `precio`, `precio_descuento`, `kit_items` (jsonb `{nombre,descripcion,precio,link}[]`), `publicado`, `estado` (`activo`\|`finalizado`\|`de_baja`) | select si `publicado` o admin o profesor dueño o alumno matriculado · insert/update/delete solo admin |
| `clases` | `id`, `curso_id`, `numero`, `fecha`, `tema`, `estado` (`programada`\|`suspendida`\|`reprogramada`) — generadas automáticamente al crear el curso | select admin/profesor dueño/alumno matriculado · write admin o profesor dueño |
| `matriculas` | `id`, `alumno_id` (FK profiles), `curso_id` (FK cursos), `estado` (`activo`\|`finalizado`\|`suspendido`\|`desertor`\|`inactivo`), `motivo_baja` (obligatorio si desertor/inactivo — RF-55, `check` a nivel DB), `fecha_desercion`, `n_clase_desercion`, `marcado_por`/`marcado_en`, `created_by` | select alumno propio + profesor del curso + admin · insert/update solo admin (la Server Action valida el rol del caller antes de llamar) |
| `materiales` | `id`, `curso_id`, `clase_id` (nullable), `titulo`, `tipo` (`pdf`\|`link`), `url`, `liberado_en` (timestamptz nullable — null=no liberado, pasado=liberado; hace de liberación automática-por-fecha y manual a la vez), `orden` | select alumnos matriculados **activo** en ese curso (una vez liberado) + profesor dueño + admin · insert/update/delete profesor dueño + admin |
| `galeria_fotos` | `id`, `url`, `categoria` (`egresados`\|`eventos`), `alt`, `orden`, `publicado` | objetivo — no creada todavía |
| `testimonios`, `faq` | contenido + `publicado`, `orden` | objetivo — no creada todavía (`cursos.testimonios_ids` ya reserva la FK) |
| `encuestas_fin_curso` / `respuestas_encuesta` | RF-47 — pregunta(s) + respuesta por alumno/matrícula | objetivo — no creada todavía |
| `contactos` | RF-42 — el cliente pidió explícitamente que la consulta del form de contacto quede visible para el personal interno, no solo por mail (excepción a la regla general "solo Resend") | objetivo — no creada todavía |

**Cupos (B4):** se derivan en runtime (`cupo_total - count(matriculas activas)` del curso), no se gestionan como contador separado que pueda desincronizarse — se calcula en el server (`admin/cursos`, `profesor`, `agregarAlumnoACursoAction`), nunca en el cliente.

**Deserción (RF-15/54/55):** `n_clase_desercion` se calcula en la Server Action (`matriculas.ts`), no con un trigger — cuenta las clases con `estado='programada'` cuya `fecha <= fecha_desercion` (las suspendidas/reprogramadas no cuentan, RF-38). Reactivar (RF-56) limpia `motivo_baja`/`fecha_desercion`/`n_clase_desercion`: no se lleva historial de episodios de deserción anteriores, solo el más reciente.

**Superposición de horario (RF-17/RF-18):** `horarios_se_superponen(dias_a, ini_a, fin_a, dias_b, ini_b, fin_b)` en SQL, con un espejo en JS (`seSuperponen()` en `lib/actions/cursos.ts`) para no hacer un roundtrip por curso candidato. Se valida contra cualquier curso que comparta aula O profesor y no esté `de_baja`.

**Supuestos tomados sobre ítems 🟡 de la spec (confirmar con el cliente más adelante):**
- RF-11 (alumno con un solo curso entra directo, sin listado intermedio): implementado literal.
- RF-14 ("al finalizar el curso, el alumno queda sin curso asignado"): interpretado como `matricula.estado = 'finalizado'`, NO se borra el vínculo (consistente con RF-57 "nunca se borran datos").
- RF-33 ("visualiza pero no descarga"): interpretado como sin botón de descarga explícito (el material abre en pestaña nueva) — no hay DRM real a nivel navegador, sería una falsa sensación de seguridad prometer más que eso con este stack.

## Fuera de alcance (no implementar)

Pagos/cobros, inscripción transaccional (el alta de `matriculas` la hace el Admin manualmente tras inscripción externa), asistencia desde celular, cursos virtuales, carreras (agrupación multi-curso). Ver `docs/ESPECIFICACION.md` sección C para el detalle completo.
