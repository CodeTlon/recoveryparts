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

## Kit / Precio informativo (B6-ish, RF-38 a RF-46)
- [x] `cursos.kit_items` (jsonb: nombre + descripción + precio referencia + link externo) — sin carrito ni stock (explícitamente fuera de alcance)
- [ ] Editor de `kit_items` en `/admin/cursos/[id]` (hoy solo existe la columna; falta el form) + sidebar "Inversión" en `/cursos/[slug]` (precio + kit, informativo)

## Fin de curso (B8, RF-47)
- [ ] Tabla `encuestas_fin_curso` / `respuestas_encuesta`
- [ ] Flujo de encuesta obligatoria al finalizar curso

## Reportes y Administración (B9, RF-48 a RF-55)
- [ ] Dashboard Admin: reportes de deserción / estado de alumnos por curso

## Sitio público + CMS (A1-A4)
- [ ] `/` (Home) — hero, capacitaciones destacadas, sección egresados (RNF-01/02/03)
- [ ] `/galeria` (A2) — ruta dedicada, bento masonry + lightbox, reemplaza sección embebida en home
- [ ] `/cursos` (A3, listado dinámico con búsqueda/filtros por área/tipo/día/modalidad, cupos en tiempo real) — reemplaza el hardcodeado `CURSOS`
- [ ] `/cursos/[slug]` (A4, detalle: temario, profesor, kit, sidebar "Inversión") — reemplaza `/curso` estático
- [ ] Tablas `galeria_fotos`, `testimonios`, `faq` (CMS-editable por Admin, reemplazan `demo-config.ts.content.*`) — `cursos.testimonios_ids` ya reserva la relación
- [ ] `app/sitemap.ts` + `app/robots.ts` (agente `seo-specialist`, obligatorio por tener páginas públicas indexables)
- [ ] Reemplazar fotos de egresados stock (pravatar) por material real del cliente — pendiente de que Recovery Parts entregue fotos/nombres reales

## Backend / Email
- [ ] Instalar `resend` + `@react-email/components` + `@react-email/render` (Bug 33 de la fábrica)
- [ ] Server Action de contacto (RF-42): notifica por mail Y guarda la consulta — el cliente pidió explícitamente que quede visible para el personal interno, así que acá SÍ hay tabla `contactos` (excepción a la regla general de "solo Resend", ver `forms.md`)
- [ ] Emails pendientes (TODOs ya marcados en el código): "te sumaron al curso X" (`matriculas.ts`), "tu contraseña fue cambiada" (`auth.ts`), template de invitación/reset custom con branding si Supabase lo permite
- [ ] `shadcn/ui` / `react-hook-form` — evaluar si hace falta; los forms de auth y campus ya funcionan con `useFormState` + HTML plano, sin esas libs
- [ ] `.env.example`

## Testing
- [ ] `npx playwright install`
- [ ] E2E: login → dashboard → RBAC de los 3 roles, 3 viewports
- [ ] Lighthouse en producción (build + start)
- [ ] `npm audit --omit=dev --audit-level=high` en 0 (postcss bundleado en Next es la única excepción documentada hoy)

## Docs
- [ ] `README.md` con Changelog
- [ ] `docs/deployment-guide.md`, `docs/technical-docs.md`, `docs/maintenance-guide.md`
- [ ] Dos proyectos Supabase creados por el usuario (`recoveryparts-dev` / `recoveryparts-prod`) + `.env.*.local` cargados
