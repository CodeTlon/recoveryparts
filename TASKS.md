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
- [ ] `README.md` completo (Changelog + setup + deploy)
- [ ] Registrar en `memory/MEMORY.md` del hub de la fábrica

## Auth e Invitaciones (B0, RF-01 a RF-11)
- [ ] Instalar `@supabase/ssr` + `@supabase/supabase-js`
- [ ] `lib/supabase/client.ts` + `server.ts` + `admin.ts`
- [ ] Tabla `profiles` + trigger `handle_new_user` + trigger anti-escalación de privilegios
- [ ] `middleware.ts` — protege `(campus)/*`, revalida con `getUser()`
- [ ] Flujo de invitación (Admin invita profesor/alumno) — `admin.inviteUserByEmail()`
- [ ] `/activar` (client component, implicit flow hash → `setSession()`)
- [ ] `/login` real (reemplaza el mock de `demo-users.ts`)
- [ ] `/recuperar` (PKCE flow, `resetPasswordForEmail`)
- [ ] `lib/auth-helpers.ts` — `requireAlumno` / `requireProfesor` / `requireAdmin`

## Roles y Permisos (B1, RF-01 a RF-11)
- [ ] Helpers SQL `is_admin()` / `is_profesor()`
- [ ] RLS de `profiles` (select propio + admin, update con trigger anti-escalación)
- [ ] Layouts gate por rol: `(campus)/alumno|profesor|admin/layout.tsx`

## Alumnos (B2, RF-12 a RF-15, RF-54 a RF-57)
- [ ] Tabla `matriculas` (estado activo/suspendido/desertor/inactivo, `motivo_baja` obligatorio en baja — RF-55)
- [ ] Admin: alta/reactivación manual de alumno (RF-56, no elimina — RF-57)
- [ ] Vista Alumno: sus matrículas + estado

## Cursos (B3, RF-16 a RF-26)
- [ ] Tabla `cursos` (modalidad, horario, aula, profesor asignado, temario)
- [ ] Validación de superposición de aula/horario al crear curso (RF-17) y al asignar profesor (RF-18)
- [ ] `/cursos` (listado dinámico, reemplaza el hardcodeado `CURSOS`) + `/cursos/[slug]` (reemplaza `/curso` estático)
- [ ] Admin: CRUD de curso + temario editable

## Cupos (B4, RF-31 a RF-35)
- [ ] Cálculo de cupo disponible en runtime (`cupo_total - matrículas activas`), server-side
- [ ] Reflejar cupos en tiempo real en `/cursos` público

## Material (B5, RF-36 a RF-37)
- [ ] Tabla `materiales` (tipo pdf/video_link, `liberado_en`)
- [ ] Profesor: subir/liberar material a alumnos matriculados

## Kit / Precio informativo (B6-ish, RF-38 a RF-46)
- [ ] `cursos.kit_items` (jsonb: nombre + precio referencia + link externo) — sin carrito ni stock (explícitamente fuera de alcance)
- [ ] Sidebar "Inversión" en `/cursos/[slug]` (precio + kit, informativo)

## Fin de curso (B8, RF-47)
- [ ] Tabla `encuestas_fin_curso` / `respuestas_encuesta`
- [ ] Flujo de encuesta obligatoria al finalizar curso

## Reportes y Administración (B9, RF-48 a RF-55)
- [ ] Dashboard Admin: reportes de deserción / estado de alumnos por curso

## Sitio público + CMS (A1-A4)
- [ ] `/` (Home) — hero, capacitaciones destacadas, sección egresados (RNF-01/02/03)
- [ ] `/galeria` (A2) — ruta dedicada, bento masonry + lightbox, reemplaza sección embebida en home
- [ ] Tablas `galeria_fotos`, `testimonios`, `faq` (CMS-editable por Admin, reemplazan `demo-config.ts.content.*`)
- [ ] `app/sitemap.ts` + `app/robots.ts` (agente `seo-specialist`, obligatorio por tener páginas públicas indexables)
- [ ] Reemplazar fotos de egresados stock (pravatar) por material real del cliente — pendiente de que Recovery Parts entregue fotos/nombres reales

## Backend / Email
- [ ] Instalar `shadcn/ui`, `react-hook-form` + `zod`, `resend` + `@react-email/components`
- [ ] Server Action de contacto (Resend-only, sin DB salvo pedido explícito) — `forms.md`
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
