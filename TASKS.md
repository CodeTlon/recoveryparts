# Tasks — Recovery Parts

Fuente de alcance: `docs/ESPECIFICACION.md` (RF-01 a RF-57). Cada tarea referencia su RF para trazabilidad. No implementar nada marcado 🔴 ni lo de la sección "Fuera de alcance" (pagos, inscripción transaccional, asistencia por celular, cursos virtuales, carreras).

## Setup (esta sesión — completado)
- [x] Copiar demo a `codetlon/output/recoveryparts/` + `npm install` + smoke test
- [x] Repo GitHub `CodeTlon/recoveryparts` + rama `dev` + push inicial
- [x] Limpieza de dead code (`components/sections/*`, `Navbar.tsx`/`Footer.tsx` legacy)
- [x] `next.config.js` → `.mjs` (formats avif/webp + deviceSizes)
- [x] Bump Next 15.5.19 → 15.5.25 (vulnerabilidad crítica resuelta)
- [x] `LICENSE` + `"license": "UNLICENSED"` + sección Licencia en README (ya venían del template)
- [x] `docs/ESPECIFICACION.md` (copia versionada de la spec)
- [x] `client-assets/recoveryparts/brand/brand-config.json` en el repo de la fábrica
- [x] `AGENTS.md` + `ARCHITECTURE.md` (contexto agnóstico de herramienta)
- [x] `.claude/CLAUDE.md` (pointer) + `settings.json` + `commands/cambio.md` + `commands/cerrar.md` + `ERRORES.md`
- [x] `MANUAL-PRUEBAS.md` (scaffold)
- [x] `README.md` completo (Changelog + setup + deploy)
- [x] Registrar en `memory/MEMORY.md` del hub de la fábrica

## Auth e Invitaciones (B0, RF-01 a RF-11)
- [x] Instalar `@supabase/ssr` + `@supabase/supabase-js` + `zod`
- [x] `lib/supabase/client.ts` + `server.ts` + `admin.ts` + `middleware.ts`
- [x] Tabla `profiles` + trigger `handle_new_user` + trigger anti-escalación de privilegios (`supabase/migrations/0001_auth_profiles.sql`)
- [x] `middleware.ts` — protege `(campus)/*`, revalida con `getUser()`
- [x] Flujo de invitación (Admin invita profesor/alumno) — `admin.inviteUserByEmail()` desde `/admin/usuarios`
- [x] `/activar` (client component, implicit flow hash → `setSession()`)
- [x] `/login` real (reemplaza el mock de `demo-users.ts`, eliminado)
- [x] `/recuperar` + `/recuperar/nueva-clave` (PKCE flow, `resetPasswordForEmail` + `/auth/confirm`)
- [x] `lib/auth-helpers.ts` — `requireAlumno` / `requireProfesor` / `requireAdmin`
- [x] Rate limiting en memoria de login/recuperar (`lib/rate-limit.ts`)
- [ ] Aplicar la migración contra `recoveryparts-dev` (pendiente de que el usuario cree los dos proyectos Supabase — ver Backend/Email más abajo) y probar el flujo end-to-end con un email real
- [ ] `npx playwright install` + E2E del flujo login→dashboard→RBAC (movido a la sección Testing, sigue pendiente)

## Roles y Permisos (B1, RF-01 a RF-11)
- [x] Helpers SQL `is_admin()` / `is_profesor()`
- [x] RLS de `profiles` (select propio + admin, update con trigger anti-escalación)
- [x] Layouts gate por rol: `(campus)/alumno|profesor|admin/layout.tsx` + dashboards reales (crecen con B2/B3)
- [x] Reactivación/desactivación de cuenta desde `/admin/usuarios` (RF-56)

## Alumnos (B2, RF-12 a RF-15, RF-54 a RF-57) — completo
- [x] Tabla `matriculas` (estado activo/finalizado/suspendido/desertor/inactivo, `motivo_baja` obligatorio en baja/deserción — RF-55)
- [x] Admin: agregar alumno a un curso — reutiliza el profile si el email ya existe (RF-13), invita si no (`agregarAlumnoACursoAction`)
- [x] Deserción (RF-15/54): profesor la marca en su propio curso, admin en cualquiera; `n_clase_desercion` calculado server-side contando solo clases `programada` (RF-38: suspendidas/reprogramadas no cuentan)
- [x] Admin: reactivar matrícula (RF-56) — nunca se borra la fila (RF-57)
- [ ] Email "te sumaron al curso X" sin token (RF-13) — pendiente de Resend (ver Backend/Email)
- [ ] Email "tu contraseña fue cambiada" tras `recuperarActualizarAction` — pendiente de Resend

## Cursos (B3, RF-16 a RF-26) — completo
- [x] Tabla `cursos` (modalidad, horario, aula, profesor asignado, temario, kit, precios) + `clases` (calendario)
- [x] Validación de superposición de aula/horario al crear/editar curso (RF-17) y al asignar profesor (RF-18) — `horarios_se_superponen()`
- [x] `/admin/cursos` (listado) + `/admin/cursos/nuevo` + `/admin/cursos/[id]` (editar + matricular alumnos)
- [x] Generación automática del calendario de clases al crear el curso (RF-31)
- [x] Mini-CV de profesor (`profiles.bio` / `foto_url`) — RF-25
- [ ] `/cursos` (listado público dinámico) + `/cursos/[slug]` (detalle) — reemplaza el hardcodeado `CURSOS`/`/curso` (sección "Sitio público + CMS" abajo)

## Cupos (B4, RF-27 a RF-30) — completo
- [x] Cálculo de cupo disponible en runtime (conteo de `matriculas` activas vs `cupo_total`), server-side (`/admin/cursos`, `/profesor`, `agregarAlumnoACursoAction`)
- [x] Precio + precio con descuento en el schema de `cursos` (falta reflejarlo en el sitio público — ver A4 abajo)

## Material (B5, RF-31 a RF-37) — funcional, falta ZIP
- [x] Tabla `materiales` (tipo pdf/link, `liberado_en` hace de liberación automática-por-fecha y manual a la vez)
- [x] Profesor: temario y calendario editables (`ClaseRow`), subir/liberar material (`MaterialManager`), suspender/reprogramar clase (RF-38)
- [x] Alumno: ve solo el título de la próxima clase (RF-37) + material liberado (visualización, no botón de descarga — RF-33)
- [ ] RF-35 (ZIP de todo el material al finalizar el curso) — necesita Supabase Storage; no se puede probar sin el proyecto real, queda para cuando exista

## Kit / Precio informativo (B6-ish, RF-38 a RF-46) — completo (falta el sitio público)
- [x] `cursos.kit_items` (jsonb: nombre + descripción + precio referencia + link externo) — sin carrito ni stock (explícitamente fuera de alcance)
- [x] Editor de `kit_items` en `/admin/cursos/[id]` (`KitItemsEditor`, filas dinámicas)
- [ ] Sidebar "Inversión" en `/cursos/[slug]` (precio + kit, informativo) — sección "Sitio público + CMS" abajo

## Fin de curso (B8, RF-47) — completo
- [x] Tablas `encuesta_preguntas` (por curso) + `encuesta_completada` (quién respondió) + `encuesta_respuestas` (anónima, sin id de alumno)
- [x] Admin: crear/eliminar preguntas y ver resultados agregados (promedio si es rating, lista si es texto) desde `/admin/cursos/[id]`
- [x] Alumno: responde una vez que su matrícula queda `finalizado`, no puede repetir (`/alumno/cursos/[id]`)
- [ ] Nivel de obligatoriedad real (RF-47 dice "obligatoria") — hoy es opcional a criterio del alumno, no hay gate que bloquee otra cosa hasta responder; confirmar con el cliente si hace falta forzarlo

## Reportes y Administración (B9, RF-48 a RF-50) — completo lo que el schema actual permite
- [x] `/admin/reportes`: ocupación por curso, deserción por curso + distribución por N° de clase, día de la semana con más deserciones, velocidad de llenado del cupo
- [ ] RF-51 (curso elegido al terminar un "nivel") y RF-52 (demanda de cursos que todavía no se dictan, capturada desde el buscador público vacío) — necesitan conceptos que el schema todavía no modela (`niveles`/pathways de cursos, `intereses_cursos`). Requieren una decisión de producto antes de modelarlos; no están armados

## Sitio público + CMS (A1-A4) — completo
- [x] `/` (Home) — hero, áreas (técnico/diseño), capacitaciones destacadas, egresados bento, testimonios, FAQ, contacto. Todo sale de `sitio_config`/`cursos`/`egresados`/`testimonios`/`faq`, nada hardcodeado (criterio de aceptación de A1)
- [x] `/galeria` (A2) — ruta dedicada, agrupada por categoría (aulas/clases/trabajos de alumnos/egresados/eventos), bento + lightbox (`GaleriaLightbox`)
- [x] `/cursos` (A3) — listado dinámico con búsqueda + filtros (área/tipo) + orden (destacados/precio) client-side, cupos en tiempo real, urgencia "¡Quedan N lugares!" — reemplaza el hardcodeado `CURSOS`
- [x] `/cursos/[slug]` (A4) — hero, requisitos, plan de estudios (acordeón), mini-CV del profesor, testimonios del curso, sidebar "Inversión" (precio+descuento, cupos, kit con links externos) — reemplaza `/curso` estático (eliminado)
- [x] Tablas `sitio_config` (singleton, hero/áreas/stats/contacto), `galeria_fotos`, `testimonios`, `faq`, `egresados`, `contactos` + RLS
- [x] CMS admin: `/admin/sitio`, `/admin/galeria`, `/admin/testimonios`, `/admin/egresados`, `/admin/faq`, `/admin/contactos` (bandeja de consultas)
- [x] `app/sitemap.ts` (estáticas + `/cursos/[slug]` dinámicas, con try/catch — Bug 24) + `app/robots.ts` (disallow admin/alumno/profesor/auth)
- [x] `SiteFooter`/`WhatsAppButton` migrados de `demo-config.ts` a `sitio_config` (antes mostraban el whatsapp/dirección hardcodeados del demo aunque el Admin editara `/admin/sitio`)
- [ ] Reemplazar fotos de egresados/galería stock por material real del cliente — pendiente de que Recovery Parts entregue fotos reales (se cargan desde `/admin/galeria` y `/admin/egresados`, no hace falta tocar código)
- [ ] Filtros de `/cursos` no se reflejan en la URL (RF de A3 lo pedía para links compartibles) — quedaron solo client-side por tiempo, functionalmente completos pero sin deep-linking
- [ ] El panel de stats del login (`/login`) sigue leyendo `demo-config.ts` en vez de `sitio_config` — decorativo, no bloquea nada, prolijidad pendiente

## Backend / Email — completo
- [x] Instalado `resend` + `@react-email/components` + `@react-email/render` (Bug 33 de la fábrica)
- [x] Server Action de contacto (RF-42, `lib/actions/contacto.ts`): honeypot + rate limit (5/hora/IP) + notifica por mail Y guarda en `contactos` — el cliente pidió explícitamente que quede visible para el personal interno (excepción a la regla general de "solo Resend", ver `forms.md`)
- [x] Los 2 emails que quedaron con `TODO(email)` ya están conectados: "te sumaron al curso X" (`matriculas.ts`) y "tu contraseña fue cambiada" (`auth.ts`)
- [x] Templates con `@react-email/components` en `emails/` (`BaseEmail` compartido + `ContactoRecibido`/`CursoAsignado`/`ContrasenaActualizada`), branding navy+naranja del `brand-config.json`, `lib/resend.ts` con placeholder de key (Bug 32, no rompe el build sin `.env`)
- [x] `.env.example` ya tenía `RESEND_*`/`COMPANY_EMAIL`; se sumó `NEXT_PUBLIC_SITE_URL` en el bloque de Auth
- [ ] `shadcn/ui` / `react-hook-form` — no hicieron falta, todos los forms (auth, campus, sitio) funcionan con `useFormState` + HTML plano
- [ ] Template de invitación/reset con branding propio en el email de Supabase Auth (hoy usa el template default de Supabase) — se configura desde el dashboard del proyecto real, no es código

## Testing
- [ ] `npx playwright install`
- [ ] E2E: login → dashboard → RBAC de los 3 roles, 3 viewports
- [ ] Lighthouse en producción (build + start)
- [ ] `npm audit --omit=dev --audit-level=high` en 0 (postcss bundleado en Next es la única excepción documentada hoy)

## Docs
- [ ] `README.md` con Changelog
- [ ] `docs/deployment-guide.md`, `docs/technical-docs.md`, `docs/maintenance-guide.md`
- [ ] Dos proyectos Supabase creados por el usuario (`recoveryparts-dev` / `recoveryparts-prod`) + `.env.*.local` cargados
