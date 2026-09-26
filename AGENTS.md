# AGENTS.md — Recovery Parts

> Contexto del proyecto para cualquier agente de IA (Claude Code, OpenCode, Codex CLI, Cursor, etc.).
> Este archivo es la fuente única de verdad — no dupliques su contenido en configs específicas de una herramienta.
> Detalle técnico profundo (esquema de DB, flujos de auth): `ARCHITECTURE.md`.
> Especificación funcional completa (todas las RF, con estado 🟢/🟡/🔴): `docs/ESPECIFICACION.md` — es la fuente de la verdad del alcance, léela antes de implementar cualquier feature nueva.

---

## Identidad del Proyecto

- **Cliente:** Recovery Parts — academia de capacitación técnica (reparación de celulares/computadoras, oficios creativos), Córdoba, Argentina.
- **Tipo:** L3 — Sitio público multipágina con CMS + Campus virtual multi-rol (Alumno / Profesor / Administrador).
- **Generado:** 2026-09-25, a partir de un demo de venta (`~/Escritorio/recoveryparts`, ver `docs/ESPECIFICACION.md` sección "Guía para el agente" — la demo es referencia visual, su lógica es 100% mock y se reemplaza por completo).
- **URL Producción:** pendiente
- **Repo GitHub:** `CodeTlon/recoveryparts`
- **Deploy prod (main):** Vercel (por defecto — sin jobs background ni n8n; revisar si el alcance crece)
- **Deploy dev (rama `dev`):** Vercel Preview

## Reglas duras (no negociables, ver `docs/ESPECIFICACION.md` sección "Guía para el agente")

1. **No implementar nada marcado 🔴 (excluido) en la spec**, ni lo que está en la sección "Fuera de alcance": pagos/cobros, inscripción transaccional, asistencia desde celular, cursos virtuales, carreras (agrupación multi-curso). El precio se **muestra**, nunca se cobra desde este sistema.
2. Antes de implementar algo marcado 🟡 (pendiente/no confirmado) en la spec, **preguntar al usuario** o dejarlo configurable — no asumir.
3. Toda ruta del campus requiere sesión; la autorización por rol **se valida en el servidor** (middleware + revalidación en Server Actions/Route Handlers), nunca solo en el cliente.
4. El sitio público es de solo lectura para todos excepto el Administrador (vía CMS del campus).
5. Si se confirma un ítem 🟡 con el usuario, actualizar `docs/ESPECIFICACION.md` (🟡→🟢 + changelog de la spec) en el mismo commit.

## Stack

- Next.js **15.5.25** (App Router), TypeScript, Tailwind CSS 3.4, `next/font` (Montserrat).
- Supabase: Auth + Postgres (RLS) + Storage. **Dos proyectos**: `recoveryparts-dev` / `recoveryparts-prod` (ver sección DB abajo).
- Resend (formulario de contacto del sitio público — solo envía email, no persiste en DB salvo pedido explícito).
- Testing: Playwright E2E (3 viewports, foco en flujo login→dashboard→RBAC de los 3 roles) + Lighthouse en producción.
- Ya instalado: `@supabase/ssr` + `@supabase/supabase-js` + `zod`.
- Pendiente de instalar (no están en el demo original): `shadcn/ui`, `react-hook-form`, `resend` + `@react-email/components`.

## Modelo de roles y estados

3 roles en `profiles.rol`: `alumno` | `profesor` | `administrador`. Un alumno tiene, por cada curso en el que está matriculado, un estado en `matriculas.estado`: `activo` | `finalizado` | `suspendido` | `desertor` | `inactivo` (el admin puede reactivar manualmente; **nunca se borran datos**, se mantiene el vínculo histórico con el curso — RF-56/RF-57). Dar de baja o marcar desertor requiere `motivo_baja` obligatorio (RF-55) y calcula `n_clase_desercion` server-side (ver `ARCHITECTURE.md`).

Un curso tiene su propio `cursos.estado`: `activo` | `finalizado` | `de_baja` — **no confundir con `matriculas.estado`**, son ejes independientes (un curso `de_baja` no acepta más inscripciones pero los alumnos ya matriculados conservan su fila histórica).

Alta de profesor/alumno: la hace el Administrador desde el campus (B0.1) → invitación por email vía Supabase Auth (`admin.inviteUserByEmail()`), rol propuesto viaja en `user_metadata`, un trigger en `auth.users` crea la fila en `profiles`. Detalle completo en `ARCHITECTURE.md` → "Auth y RLS".

## Rutas

**Público** (SSR/SSG, editable por Admin vía CMS): `/`, `/galeria`, `/cursos`, `/cursos/[slug]`.
**Auth:** `/login`, `/activar` (landing de invitación — implicit flow, ver `ARCHITECTURE.md`), `/recuperar` + `/recuperar/nueva-clave` (reset — PKCE vía `/auth/confirm`).
**Campus** (route groups gateados por rol en su `layout.tsx`): `(campus)/alumno/*`, `(campus)/profesor/*`, `(campus)/admin/*`.

## Variables de Entorno

```
# Usado para armar links de email (invitación / recuperar contraseña). Mismo
# valor en ambos entornos salvo que cambie el dominio.
NEXT_PUBLIC_SITE_URL=

# .env.development.local → npm run dev → Supabase recoveryparts-dev
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# .env.production.local → npm run build && npm start → Supabase recoveryparts-prod
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (mismo valor en ambos entornos salvo pedido del cliente)
RESEND_API_KEY=
RESEND_FROM_NAME=
RESEND_FROM_EMAIL=
COMPANY_EMAIL=
```
Infra 100% manual del usuario (creación de proyectos Supabase, dominios, deploy) — excepción: migraciones contra `-dev` vía `scripts/db-sync-dev.mjs` (ver `deploy.md` de la fábrica). PROD se promueve siempre a mano.

## Diseño — Decisiones Clave

- **Paleta** (ya implementada en `tailwind.config.ts`, ver `client-assets/recoveryparts/brand/brand-config.json` en el repo de la fábrica): fondo navy profundo `#08132a`, superficies `#101b33`/`#151f37`, acento naranja industrial `#ff6b35`.
- **Tipografía:** Montserrat (única, headings y body).
- **Estilo:** "Industrial Technical Narrative" — técnico, de taller, bordes rectos (`radius: sharp`).

## Quirks y Advertencias

- El demo original (`~/Escritorio/recoveryparts`, no tocar — es la referencia de venta) tenía dos fuentes de contenido desincronizadas: `demo-config.ts` (no usado por las páginas) vs. arrays hardcodeados inline. En el proyecto real la única fuente de verdad es la base de datos (tablas `cursos`/`testimonios`/`faq`/`galeria_fotos`) — no reintroducir un config estático paralelo.
- `/curso` (singular, estática, hardcodeada a "iPhone") se reemplaza por `/cursos/[slug]` dinámica.
- Fotos de egresados actuales son stock (pravatar) con nombres inventados — quedan como placeholder hasta que el cliente entregue material real (ver `TASKS.md`).
- Invitaciones de Supabase Auth usan **implicit flow** (`#access_token=...` en el hash), no `?code=` — la página `/activar` tiene que ser un client component que parsea el hash y llama `setSession()` explícito. Ver Bug 35 en `bugs.md` de la fábrica.
- En Server Components/Route Handlers usar siempre `supabase.auth.getUser()` para revalidar sesión, nunca `getSession()` (riesgo de rotación de refresh token — Bug 31 de la fábrica).
- `/auth/confirm` (route handler) SOLO maneja el flujo PKCE de `resetPasswordForEmail` (`?code=`). No mezclar con el flujo de invitación (hash, arriba) — son dos mecanismos distintos aunque ambos "activan" una cuenta.
- Rate limiting de `loginAction`/`recuperarSolicitarAction` es en memoria por instancia (`lib/rate-limit.ts`, patrón calcado de `vimet`) — no persiste entre cold starts ni se comparte entre instancias serverless. Alcanza para frenar scripts básicos; si el tráfico crece, migrar a Upstash/Redis con la misma firma.
- El alta de usuarios es SOLO por invitación del Admin (`admin.inviteUserByEmail`, ver `/admin/usuarios`) — no hay `signUp` público. El trigger `handle_new_user` solo respeta el `rol` del metadata cuando `auth.users.invited_at is not null`, así que un eventual signUp público jamás podría auto-asignarse admin/profesor (cae siempre en `alumno`).
- Hay 3 emails pendientes marcados con `// TODO(email):` en el código (`lib/actions/matriculas.ts` y `lib/actions/auth.ts`) — no se pueden mandar hasta instalar Resend (Backend/Email en `TASKS.md`). Buscar ese string al retomar ese bloque.
- Supuestos tomados sobre ítems 🟡 de `docs/ESPECIFICACION.md` (RF-11, RF-14, RF-33) — están documentados en `ARCHITECTURE.md` → "Esquema de datos", confirmar con el cliente antes de la entrega.

## Comandos Rápidos

```bash
npm run dev          # Dev server
npm run build         # Build producción
npm start             # Serve producción (para Lighthouse)
npx playwright test   # Tests E2E
npx tsc --noEmit       # Type-check
```

## Historial de Cambios

| Fecha | Rama | Cambio |
|-------|------|--------|
| 2026-09-25 | dev | Fundación del proyecto real a partir del demo — repo, contexto (AGENTS.md/ARCHITECTURE.md), limpieza de dead code, TASKS.md |
| 2026-09-26 | dev | Auth e Invitaciones (B0) + Roles y Permisos (B1): tabla `profiles` + RLS + triggers, clients Supabase (`@supabase/ssr`), middleware de sesión, `/login` `/activar` `/recuperar` `/recuperar/nueva-clave` reales, invitación de usuarios desde `/admin/usuarios`, layouts gateados `(campus)/alumno\|profesor\|admin`. Reemplaza el mock `/plataforma` + `demo-users.ts` (eliminados) |
| 2026-09-26 | dev | Alumnos (B2) + Cursos (B3) + Cupos (B4) + Material (B5): `profiles.apellido` (RF-57), tablas `cursos`/`clases`/`matriculas`/`materiales` + RLS, validación de superposición de horario/aula/profesor, generación automática del calendario de clases, deserción con cálculo de `n_clase_desercion`, `/admin/cursos/*` (alta/edición/matricular), `/profesor/cursos/[id]` (temario, material, marcar deserción), `/alumno/cursos/[id]` (próxima clase + material liberado). `npm run build` y `tsc --noEmit` verificados sin Supabase real |
