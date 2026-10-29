# recoveryparts — memoria de sesion

> Contexto estable: `AGENTS.md` y `.ai/context/00_INDEX.md`. Este archivo guarda lo que cambia sesion a sesion (avisos, quirks, historial).

## Aviso
Ramas `feature/* -> dev -> test` por merge directo; solo `test -> main` va por PR (despliega produccion, con OK de Mateo). Nunca commit directo a `dev`, `test` ni `main`.

## Stack vigente (2026-10-16)
Next 16.4.2, React 19.3.1, TypeScript 6.0.3, Tailwind 4.3.3, ESLint 10.13.0, Postgres 16 (desplegado), Node 22. Excepciones: sesion propia y `postgres.js`. Fuente de versiones: `codetlon-cloud/.claude/modules/stack-versions.md`.

## Quirks
- **UI: leer `design.md` antes de tocar pantallas** (sistema fijado en v0.17.0). Nada de `uppercase tracking-*`, `<em>` resaltado en títulos ni efectos tipo aurora/spotlight.
- Web Worker con Turbopack: `new Worker(new URL('./x.worker.ts', import.meta.url), { type: 'module' })`. Sin `type: 'module'` el `.ts` se copia como archivo suelto, sin compilar. La CSP necesita `worker-src 'self'`.
- Un canvas se transfiere a OffscreenCanvas una sola vez: en desarrollo React monta el efecto dos veces, por eso `CircuitField` reutiliza el worker de cada canvas (WeakMap) y solo lo cierra si el canvas salió de la página.
- Ver el campus desde otra máquina sin túnel: `next dev` con `DEV_ORIGINS=<ip>` (habilita `allowedDevOrigins`; sin eso el JS no hidrata, el form de login se manda sin JS con `Origin: null` y la server action da 500). Con `next start` la cookie es `Secure` y solo anda por https o `localhost`.
- E2E que edita un texto del CMS: el aviso «Guardado» del guardado anterior sigue visible; esperar el cambio con `expect.poll` + reload, no con el aviso.
- E2E del campus: sin `SESSION_SECRET` (el mismo del servidor) en el entorno de Playwright, los tests de campus se saltean en silencio (34 skipped).
- `experimental.inlineCss` NO: duplica el CSS en el HTML (34 → 80 KB) y empeora el FCP.
- Texto entre `inline-block`: un espacio al final de la caja se descarta. Los espacios entre palabras van afuera (pasó con `TituloExpandido`).
- No exportar valores (objetos/constantes) desde un archivo `'use client'` para usarlos en el servidor: llegan como referencia de cliente (pasó con las etiquetas de la galería → `src/lib/galeria.ts`).
- `next dev` (16.4) agrega un bloque a `AGENTS.md`: no commitearlo sin decidirlo (o `agentRules: false`).
- Matar servidores locales por PID del puerto (`ss -ltnp | grep :PUERTO`), no con `pkill -f next-server`: se lleva puestos los de otros proyectos de la cuenta.
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
- `proxy.ts` corre delante de las server actions: Next le limita el cuerpo a 10 MB (`proxyClientMaxBodySize`). Toda subida por server action necesita ese tope en `next.config.js`, no solo `serverActions.bodySizeLimit`.
- `db/bootstrap.sql` corre en CADA arranque (Coolify migra al iniciar): nada de `grant` amplios ahí, se reaplican siempre.
- `npm run db:migrate` no corre `db/seed.sql` (solo con `--seed`); el seed de pruebas crea sus aulas.
- Los textos con `uppercase` de CSS salen en mayúsculas en `innerText` (Playwright): comparar sin distinguir mayúsculas.

## Historial de Cambios
| Fecha | Rama | Cambio |
|-------|------|--------|
| 2026-10-29 | feature/dev2-cms-paginacion | v0.18.0 — paginación numerada en el admin (con filtros en Cursos), todo el sitio editable desde Sitio web (`site_settings.textos`), listas del CMS con modal, cursor propio en el sitio público. 126 E2E. |
| 2026-10-29 | feature/dev2-graficos | v0.17.5 — gráficos y admin: reportes con filtro por área, inscripciones por mes, barra partida, paleta `dato*` validada, sin `AnimatedBar`; encuestas con reparto de notas; «Por empezar» con inscriptos/cupo. 119 E2E. |
| 2026-10-29 | feature/dev2-campus-ux | v0.17.4 — campus más simple: Reportes en su página, Resumen del día, curso del profesor en pestañas, menú agrupado con contador de consultas, aulas y sitio plegables, `Pestanas` común. 112 E2E. |
| 2026-10-29 | feature/dev2-filtro-pie | v0.17.3 — filtro real de destacadas en la portada (`DestacadosFiltro`), pie compacto (marca + columnas, sin invitación, nombre gigante ni «Volver arriba»), `DEV_ORIGINS` para `next dev` por IP. 110 E2E. |
| 2026-10-29 | feature/dev2-portada-pie | v0.17.2 — sin galería pública (`/galeria` → inicio, fotos en `cms_galeria`), portada 15,7 → 9,4 pantallas en el celular, pie en tres franjas (invitación, datos, firma), fondo atenuado detrás del texto. 107 E2E. |
| 2026-10-29 | feature/dev2-optimizacion | v0.17.1 — fondo de circuito en Web Worker (OffscreenCanvas), Archivo 90 → 58 KB, `sizes` de imágenes; corrige el título animado sin espacios (estaba en producción); celular: campos de 16 px, toques de 40 px, «Más filtros» en `/cursos`, tablas del campus. 104 E2E. |
| 2026-10-28 | feature/dev2-rediseno | v0.17.0 — rediseño de sitio, acceso y campus (`design.md`: OKLCH, Archivo + Montserrat, fondo vivo de circuito, efectos en CSS/canvas sin librerías, View Transitions) y paginación con la página en la URL (`src/lib/paginar.ts`). 95 E2E, a11y 100, CLS 0; portada ~8 pts de Lighthouse móvil debajo de `dev`. |
| 2026-10-27 | feature/dev2-qa-campus | v0.16.1 — QA de los 102 casos del campus (en `dev`: 100 OK, 2 fallas) y auditoría. Arregla subida de PDF > 10 MB, Campus › Aulas vacía, `anon` en el bootstrap, nodemailer, seed sin aulas, login de cuenta deshabilitada, `motion` fuera del sitio, ficha del curso en el celular, a11y y canonical. Informe en `docs/AUDITORIA-2026-10-27.md`. |
| 2026-10-21 | feat/aulas-sitio | Sección pública «Aulas» (RF-60): `/aulas` con video general y fichas por aula (destacados con ícono, fotos, video), pestaña en Campus › Sitio web, link en menú/«Nosotros»/sitemap; migración 0030 (revoca a mano los permisos de anon: ver KNOWN_ISSUES). Sin mergear. |
| 2026-10-21 | fix/auditoria-seguridad-logica | v0.16.0 — auditoría completa de seguridad, lógica, estilos/accesibilidad, SEO y rendimiento con sus correcciones (migraciones 0019-0029: RLS por conjuntos, anon mínimo, calendario atómico/versionado/avisos pendientes, locks de agenda; CSP con nonce, caché público, streaming, video en segundo plano, `.env.development` fuera del repo, E2E de campus por rol, job de navegadores). Mergeada a `dev`, `test` y `main` (PR #22) y desplegada en producción. Pendientes en KNOWN_ISSUES. |
| 2026-10-16 | feature/dev2-estandar-2026 | v0.15.0 — estandar de versiones de la flota (Next 16, React 19, Tailwind 4, ESLint 10 nuevo, `proxy.ts`). 36 E2E verdes, audit de runtime en 0. |
| 2026-10-15 | dev/test | v0.14.x — estandar de Coolify (Node 22, health con `started_at`, E2E, workflows, compose, fuentes autoalojadas, transcode). |
