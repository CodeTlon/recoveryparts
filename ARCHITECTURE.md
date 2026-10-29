# ARCHITECTURE — Recovery Parts

Mapa para mantenimiento, vigente al 2026-10-28. El detalle esta en `.ai/context/` (empezar por `00_INDEX.md`) y `docs/ARQUITECTURA.md`. No releas el repo entero: busca tu tipo de cambio abajo.

## Stack
Next.js 16.4.2 (App Router, `output: 'standalone'`) · React 19.3.1 · TypeScript 6 · Tailwind 4 (tokens en `@theme` de `src/app/globals.css`) · Postgres 16 plano (`postgres.js` 3.4.5, sin ORM) con RLS · sesion propia (`SESSION_SECRET`) · SMTP (`nodemailer`) · archivos en volumen (`STORAGE_DIR`). Node 22. Coolify con `docker-compose.coolify.yml`.

## Capas
Server Components leen con el rol y el usuario de la sesion (RLS aplica) · Server Actions y Route Handlers escriben y sirven archivos. `src/proxy.ts` (antes `middleware.ts`, Next 16): sin sesion va a `/login`, cuenta no activa queda afuera y cada rol solo entra a su `/campus/<rol>`; ademas aplica los encabezados de seguridad (`src/lib/security-headers.ts`) con una CSP de nonce por request: las paginas con scripts se renderizan siempre en cada request. La autorizacion real es `requireRole()` mas RLS en todas las tablas.

## Estructura
- `src/app/` — publico (`/`, `cursos`, `aulas`, `preguntas-frecuentes`, `contacto`; `/galeria` se sacó en v0.17.2 y redirige al inicio), `login`, `activar`, `olvide-mi-contrasena`, `campus/{admin,profesor,alumno}`, `api/`, `media/`.
- `src/lib/` — `auth.ts`, `session.ts`, `users.ts`, `db/` (conexion `postgres.js` y `sqlAdmin()`), `storage.ts` y `media.ts` (archivos), `transcode.ts` (video), `mail.ts`, `encuestas.ts`, `rate-limit.ts`.
- `db/migrations/` y `scripts/migrate.mjs` — migraciones SQL (en Coolify corren solas al arrancar).
- `tests/e2e/` — Playwright en 3 viewports (99 casos: humo, CSP, acceso, formularios, campus). `tests/unit/` — `node:test` (13).

## Para cambios comunes
| Querés cambiar… | Abri |
|---|---|
| Autorizacion o roles | `src/lib/session.ts`, `src/proxy.ts`, politicas RLS en `db/migrations/` |
| Una tabla o columna | migracion nueva `db/migrations/NNNN_*.sql` (nunca editar una aplicada) + RLS; probar con `npm run db:reset` |
| Acciones del admin | `src/app/campus/admin/actions.ts` (tipo `R = { ok?, error? }`), formularios con `ActionForm`/`Field` de `src/components/campus/ui.tsx` |
| Datos del sitio publico | `src/lib/data.ts` (cache de 60 s con tag `publico`); si una accion cambia lo que el sitio muestra, llamar a `invalidarPublico()` (`src/lib/cache-publico.ts`) |
| SEO de una pagina publica | `metaPagina()` y `JsonLd` (`src/lib/seo.ts`, `src/components/seo/`) |
| Subida de archivos | `src/app/api/media`, `src/lib/storage.ts`; los PDFs pasan por `/api/material/[id]` |
| Estilos | **`design.md` primero** (sistema fijado: tokens, tipografía, motivo de circuito, movimiento). `src/app/globals.css` (`@theme`, `@utility`, animaciones de scroll en CSS); las utilidades propias no pueden llamarse como las nativas de Tailwind 4 |
| Campus | `CampusShell.tsx` (menú por rol en `NAV`, con grupos y avisos), `ui.tsx` (`PageHead`, `Pestanas`, `StatTile`…); una página por tarea, pestañas en `?tab=` |
| Gráficos | `campus/charts.tsx` (server components, sin JS en el cliente) usados por `ReportesPanel.tsx` (filtro `?area=`), Resumen y Encuestas. `AnimatedBar` se borró en v0.17.5 |
| Efectos del sitio público | `src/components/ui/` (`CircuitField` — el dibujo vive en `ui/circuito/motor.ts` y corre en un Web Worker con OffscreenCanvas, `ui/circuito/circuito.worker.ts`, o en la página si no hay soporte —, `TituloExpandido`, `Inclinable`, `Magnetico`, `SectionTitle`, `EncabezadoPagina`, `Paginas`); sin librerías de animación en el sitio público |
| Paginación | `src/lib/paginar.ts` (reglas y tests), `components/ui/Paginas.tsx` (público), `components/campus/Paginacion.tsx` (campus) |

## Dónde no meterse sin pensar
- `clienteAdmin()` / `sqlAdmin()` se saltean RLS: solo en servidor y despues de validar el rol.
- No hay registro publico: solo el admin crea usuarios por invitacion.
- En Next 16 el archivo es `proxy.ts`, no `middleware.ts`.
- Una pagina que lee la sesion tiene que ser dinamica (`force-dynamic`): sin `DATABASE_URL` en el build no llama a `cookies()` y Next la prerenderiza estatica (le paso a `/activar`).
