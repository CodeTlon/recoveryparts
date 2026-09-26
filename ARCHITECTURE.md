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

Todo el alcance de `docs/ESPECIFICACION.md` está implementado salvo RF-35 (ZIP de
material, necesita Storage real), RF-47 obligatoriedad estricta, RF-51/RF-52 (niveles
de curso, demanda no dictada) y testing/docs finales — ver `TASKS.md` para el detalle vivo.

```
src/
├── app/
│   ├── page.tsx                      # ✅ Home (A1) — hero/áreas/destacados/egresados/testimonios/faq/contacto, todo de la DB
│   ├── galeria/page.tsx              # ✅ A2 — agrupada por categoría + lightbox
│   ├── cursos/page.tsx               # ✅ A3 — listado dinámico, búsqueda/filtros client-side
│   ├── cursos/[slug]/page.tsx        # ✅ A4 — detalle, generateStaticParams con try/catch (Bug 24)
│   ├── sitemap.ts / robots.ts        # ✅ SEO obligatorio (checklist universal pre-entrega)
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
│       ├── admin/cursos/[id]/page.tsx  # ✅ edición + kit + matricular alumnos + estado matrícula + encuesta
│       ├── admin/reportes/page.tsx     # ✅ ocupación, deserción, día con más bajas, velocidad de llenado
│       ├── admin/sitio/page.tsx        # ✅ hero/áreas/stats/contacto (singleton `sitio_config`)
│       ├── admin/galeria/page.tsx      # ✅ CRUD `galeria_fotos`
│       ├── admin/testimonios/page.tsx  # ✅ CRUD `testimonios`
│       ├── admin/egresados/page.tsx    # ✅ CRUD `egresados`
│       ├── admin/faq/page.tsx          # ✅ CRUD `faq`
│       └── admin/contactos/page.tsx    # ✅ bandeja de consultas del form público (RF-42)
├── components/
│   ├── layout/          # SiteNav (sin cambios), SiteFooter y WhatsAppButton ahora async — leen `getSitioConfig()`
│   ├── public/           # ✅ CursosCatalogo, TemarioAcordeon, GaleriaLightbox, ContactoForm, FaqAccordion
│   └── campus/           # ✅ CampusShell, InvitarUsuarioForm, CursoForm (+ KitItemsEditor),
│                         #    AgregarAlumnoForm, MatriculaEstadoForm, ClaseRow, MaterialManager,
│                         #    EncuestaManager (admin), EncuestaAlumnoForm, CmsFotoForm/TestimonioForm/
│                         #    FaqForm/EgresadoForm/SitioForm, CmsRowActions (toggle publicado + borrar)
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # ✅ browser client
│   │   ├── server.ts    # ✅ server client (cookies)
│   │   ├── admin.ts      # ✅ service_role, SOLO en Server Actions
│   │   └── middleware.ts # ✅ updateSession — usado por src/middleware.ts
│   ├── actions/
│   │   ├── auth.ts        # ✅ login/logout/recuperar (invalida sesiones y avisa por mail al cambiar clave)
│   │   ├── usuarios.ts     # ✅ invitar + toggleCuentaActiva (admin-only)
│   │   ├── cursos.ts       # ✅ crear/editar (valida superposición aula+profesor, kit_items) + dar de baja
│   │   ├── matriculas.ts   # ✅ agregar alumno a curso (reusa o invita, avisa por mail) + cambiar estado
│   │   ├── clases.ts       # ✅ editar tema + suspender/reprogramar clase
│   │   ├── material.ts     # ✅ subir/liberar/eliminar material
│   │   ├── encuestas.ts    # ✅ crear/eliminar pregunta, responder (anónima), leer resultados (admin client)
│   │   ├── cms.ts          # ✅ sitio_config + galeria/testimonios/faq/egresados (CRUD simple) + contactos
│   │   └── contacto.ts     # ✅ form público: honeypot + rate limit + guarda + notifica
│   ├── auth-helpers.ts   # ✅ getUserAndProfile / requireAlumno / requireProfesor / requireAdmin / nombreCompleto
│   ├── rate-limit.ts      # ✅ limitador en memoria (login, recuperar, contacto — por IP y/o email)
│   ├── site-url.ts        # ✅ siteUrl() + safeNextPath() (allowlist de redirects)
│   ├── sitio.ts            # ✅ getSitioConfig() — lee el singleton con fallback si la fila no existe
│   ├── resend.ts           # ✅ cliente Resend con placeholder de key (Bug 32, no rompe build sin .env)
│   ├── mail.ts             # ✅ enviarCursoAsignado / enviarContrasenaActualizada / enviarContactoRecibido
│   └── validations/       # objetivo — hoy los schemas Zod viven inline en cada action
├── middleware.ts          # ✅ protege (campus)/*, revalida sesión — Next 15 clásico (no `proxy.ts`, eso es Next 16+)
emails/                    # ✅ BaseEmail (layout compartido, navy+naranja) + ContactoRecibido/CursoAsignado/ContrasenaActualizada
```

**Imágenes de contenido (CMS):** todo lo que carga el Admin como URL (fotos de galería,
egresados, testimonios, imágenes de curso, foto de profesor) se renderiza con `<img>`
plano, NO `next/image` — el dominio es arbitrario (el Admin pega cualquier URL) y
`next.config.mjs` exige `remotePatterns` explícitos por hostname. `next/image` sigue
usándose para los assets fijos de `/public` (logo, hero por defecto). Si el proyecto
real termina centralizando todo en Supabase Storage, se puede migrar agregando el
hostname `[ref].supabase.co` a `remotePatterns` — pero como el campo es una URL libre,
lo más simple es dejarlo así permanentemente.

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
en un solo archivo porque sus RLS se referencian cruzadas) · `0003_material.sql` · `0004_encuestas.sql` ·
`0005_sitio_publico.sql` (sitio_config, galeria_fotos, testimonios, faq, egresados, contactos + `cursos.destacado`).

| Tabla | Campos clave | RLS |
|---|---|---|
| `profiles` | `id` (FK `auth.users`), `nombre`, `apellido`, `telefono`, `email`, `rol` (`alumno`\|`profesor`\|`administrador`), `cuenta_activa`, `bio`/`foto_url` (mini-CV de profesor, RF-25) | select propio + admin todos · update propio (campos limitados, trigger anti-escalación) + admin todos |
| `cursos` | `id`, `slug`, `titulo`, `tipo` (`curso`\|`taller`), `area` (`tecnico`\|`diseno`), `descripcion`, `requisitos`, `temario` (jsonb `{titulo,descripcion}[]`), `imagenes[]`, `video_url`, `dias_semana` (smallint[]), `hora_inicio`/`hora_fin`, `aula`, `fecha_inicio`, `duracion_semanas`, `profesor_id` (FK profiles), `cupo_total`, `precio`, `precio_descuento`, `kit_items` (jsonb `{nombre,descripcion,precio,link}[]`), `publicado`, `estado` (`activo`\|`finalizado`\|`de_baja`) | select si `publicado` o admin o profesor dueño o alumno matriculado · insert/update/delete solo admin |
| `clases` | `id`, `curso_id`, `numero`, `fecha`, `tema`, `estado` (`programada`\|`suspendida`\|`reprogramada`) — generadas automáticamente al crear el curso | select admin/profesor dueño/alumno matriculado · write admin o profesor dueño |
| `matriculas` | `id`, `alumno_id` (FK profiles), `curso_id` (FK cursos), `estado` (`activo`\|`finalizado`\|`suspendido`\|`desertor`\|`inactivo`), `motivo_baja` (obligatorio si desertor/inactivo — RF-55, `check` a nivel DB), `fecha_desercion`, `n_clase_desercion`, `marcado_por`/`marcado_en`, `created_by` | select alumno propio + profesor del curso + admin · insert/update solo admin (la Server Action valida el rol del caller antes de llamar) |
| `materiales` | `id`, `curso_id`, `clase_id` (nullable), `titulo`, `tipo` (`pdf`\|`link`), `url`, `liberado_en` (timestamptz nullable — null=no liberado, pasado=liberado; hace de liberación automática-por-fecha y manual a la vez), `orden` | select alumnos matriculados **activo** en ese curso (una vez liberado) + profesor dueño + admin · insert/update/delete profesor dueño + admin |
| `galeria_fotos` | `id`, `url`, `categoria` (`egresados`\|`eventos`), `alt`, `orden`, `publicado` | objetivo — no creada todavía |
| `testimonios`, `faq` | contenido + `publicado`, `orden` | objetivo — no creada todavía (`cursos.testimonios_ids` ya reserva la FK) |
| `encuesta_preguntas` | `id`, `curso_id`, `pregunta`, `tipo` (`rating`\|`texto`), `orden` — RF-47 | select admin/profesor dueño/alumno matriculado · write solo admin |
| `encuesta_completada` | `matricula_id` (PK, FK matriculas), `completed_at` — marca "ya respondió", SIN el contenido | select propia + admin · insert propia (una sola vez, PK) |
| `encuesta_respuestas` | `id`, `pregunta_id`, `respuesta`, `created_at` — **sin ninguna columna de alumno/matrícula**, anónima de verdad | insert: alumno matriculado en el curso de esa pregunta · **sin policy de select** (los reportes leen con `createAdminClient()` desde una Server Action que valida admin/profesor-dueño a mano, ver `lib/actions/encuestas.ts`) |
| `sitio_config` | Singleton (`id=1`, `check`). `hero`/`areas`/`stats`/`contacto` jsonb — textos e imágenes editables de la Home | select público (`true`) · update solo admin (sin insert/delete, la fila la siembra la migración) |
| `contactos` | `id`, `nombre`, `email`, `telefono`, `mensaje`, `leido` — RF-42, el cliente pidió explícitamente que la consulta quede visible para el personal interno, no solo por mail (excepción a "solo Resend") | insert público (`true`, cualquiera sin sesión) · select/update solo admin |

`galeria_fotos`, `testimonios`, `faq`, `egresados` comparten el mismo patrón de RLS: select si `publicado=true` o admin, resto de operaciones solo admin. `cursos.destacado`/`orden_destacado` controlan qué aparece en "Capacitaciones Destacadas" de la Home.

**Cupos (B4):** se derivan en runtime (`cupo_total - count(matriculas activas)` del curso), no se gestionan como contador separado que pueda desincronizarse — se calcula en el server (`admin/cursos`, `profesor`, `agregarAlumnoACursoAction`), nunca en el cliente.

**Deserción (RF-15/54/55):** `n_clase_desercion` se calcula en la Server Action (`matriculas.ts`), no con un trigger — cuenta las clases con `estado='programada'` cuya `fecha <= fecha_desercion` (las suspendidas/reprogramadas no cuentan, RF-38). Reactivar (RF-56) limpia `motivo_baja`/`fecha_desercion`/`n_clase_desercion`: no se lleva historial de episodios de deserción anteriores, solo el más reciente.

**Superposición de horario (RF-17/RF-18):** `horarios_se_superponen(dias_a, ini_a, fin_a, dias_b, ini_b, fin_b)` en SQL, con un espejo en JS (`seSuperponen()` en `lib/actions/cursos.ts`) para no hacer un roundtrip por curso candidato. Se valida contra cualquier curso que comparta aula O profesor y no esté `de_baja`.

**Supuestos tomados sobre ítems 🟡 de la spec (confirmar con el cliente más adelante):**
- RF-11 (alumno con un solo curso entra directo, sin listado intermedio): implementado literal.
- RF-14 ("al finalizar el curso, el alumno queda sin curso asignado"): interpretado como `matricula.estado = 'finalizado'`, NO se borra el vínculo (consistente con RF-57 "nunca se borran datos").
- RF-33 ("visualiza pero no descarga"): interpretado como sin botón de descarga explícito (el material abre en pestaña nueva) — no hay DRM real a nivel navegador, sería una falsa sensación de seguridad prometer más que eso con este stack.
- RF-47 ("encuesta obligatoria"): implementado como disponible-pero-no-forzada — no hay ningún gate que bloquee otra pantalla hasta responder. Confirmar si hace falta forzarlo antes de la entrega.
- RF-51/RF-52 (curso elegido al pasar de "nivel", demanda de cursos no dictados): NO implementados — necesitan modelar `niveles`/pathways de cursos y un formulario público de interés que hoy no existen. Requieren definición de producto primero.

## Fuera de alcance (no implementar)

Pagos/cobros, inscripción transaccional (el alta de `matriculas` la hace el Admin manualmente tras inscripción externa), asistencia desde celular, cursos virtuales, carreras (agrupación multi-curso). Ver `docs/ESPECIFICACION.md` sección C para el detalle completo.
