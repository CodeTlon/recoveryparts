# recoveryparts — memoria de sesion

> Contexto estable: `AGENTS.md` y `.ai/context/00_INDEX.md`. Este archivo guarda lo que cambia sesion a sesion (avisos, quirks, historial).

## Aviso
Ramas `feature/* -> dev -> test` por merge directo; solo `test -> main` va por PR (despliega produccion, con OK de Mateo). Nunca commit directo a `dev`, `test` ni `main`.

## Stack vigente (2026-10-16)
Next 16.4.2, React 19.3.1, TypeScript 6.0.3, Tailwind 4.3.3, ESLint 10.13.0, Postgres 16 (desplegado), Node 22. Excepciones: sesion propia y `postgres.js`. Fuente de versiones: `codetlon-cloud/.claude/modules/stack-versions.md`.

## Quirks
- Coolify: *Docker Compose Location* tiene que ser `/docker-compose.coolify.yml`. Con `/docker-compose.yml` (desarrollo) solo se despliega la base, `app` no existe y el dominio desaparece (pasó en producción el 2026-10-21).
- `.env.development` NO se versiona: `npm run setup:dev` lo crea desde `.env.development.example` con un `SESSION_SECRET` aleatorio.
- No poner un `loading.tsx` en la raíz de `src/app/`: empieza a enviar la página antes de `notFound()` y un curso inexistente responde 200 (soft-404).
- El builder de consultas devuelve el error en vez de lanzarlo: si un listado sale vacío sin motivo, mirar el log del servidor (`db: … falló`).
- Firefox/Safari no corren en esta VPS (faltan librerías y no hay sudo): los prueba el job `navegadores` de la CI.
- La CSP lleva nonce por request (`src/proxy.ts`): las páginas con scripts van `force-dynamic`. `/activar` salía estática en el build y siempre decía «El link venció» (sin `DATABASE_URL` no llamaba a `cookies()`).
- Los datos públicos se cachean 60 s con el tag `publico`; la server action que los cambie llama a `invalidarPublico()`.
- `imagenOpcional()` solo acepta rutas del sitio: `next/image` no tiene `remotePatterns`.
- Para probar en local fuera de tu rango de puertos: `docker-compose.yml` fija el 54322; levantar una Postgres aparte y pasar `DATABASE_URL` por entorno (el migrador lo acepta).
- `src/proxy.ts` reemplaza a `middleware.ts` (Next 16). Aplica tambien los encabezados de seguridad.
- La imagen Docker necesita `--build-arg NEXT_PUBLIC_SITE_URL=...` (sin eso, `Invalid URL`).
- `npm audit` completo muestra `braces` (cadena de `eslint-config-next`): es de lint y no tiene parche; el gate es `npm audit --omit=dev` en 0.
- Tailwind 4: sin clases pegadas a `${}` y sin utilidades propias llamadas `delay-`, `duration-`, etc.
- `useRef` en React 19 exige valor inicial.

## Historial de Cambios
| Fecha | Rama | Cambio |
|-------|------|--------|
| 2026-10-21 | feat/aulas-sitio | Sección pública «Aulas» (RF-60): `/aulas` con video general y fichas por aula (destacados con ícono, fotos, video), pestaña en Campus › Sitio web, link en menú/«Nosotros»/sitemap; migración 0030 (revoca a mano los permisos de anon: ver KNOWN_ISSUES). Sin mergear. |
| 2026-10-21 | fix/auditoria-seguridad-logica | v0.16.0 — auditoría completa de seguridad, lógica, estilos/accesibilidad, SEO y rendimiento con sus correcciones (migraciones 0019-0029: RLS por conjuntos, anon mínimo, calendario atómico/versionado/avisos pendientes, locks de agenda; CSP con nonce, caché público, streaming, video en segundo plano, `.env.development` fuera del repo, E2E de campus por rol, job de navegadores). Mergeada a `dev`, `test` y `main` (PR #22) y desplegada en producción. Pendientes en KNOWN_ISSUES. |
| 2026-10-16 | feature/dev2-estandar-2026 | v0.15.0 — estandar de versiones de la flota (Next 16, React 19, Tailwind 4, ESLint 10 nuevo, `proxy.ts`). 36 E2E verdes, audit de runtime en 0. |
| 2026-10-15 | dev/test | v0.14.x — estandar de Coolify (Node 22, health con `started_at`, E2E, workflows, compose, fuentes autoalojadas, transcode). |
