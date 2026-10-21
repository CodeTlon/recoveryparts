# KNOWN_ISSUES — Recovery Parts

## Vigente (2026-10-16)
- `npm audit` completo conserva 5 altas de herramientas de desarrollo: `braces` <= 3.0.3 via `eslint-config-next` -> `fast-glob` -> `micromatch`. Sin version corregida publicada; no entra al runtime (`npm audit --omit=dev` = 0). El override `next.postcss` se retiro (Next 16.4.2 ya trae un `postcss` corregido).
- ESLint se incorporo el 2026-10-16: 66 avisos, 0 errores. 58 son `@typescript-eslint/no-explicit-any` (el acceso a datos con `postgres.js` usa `any`), 2 `react-hooks/refs`, el resto reglas de React nuevas. Deuda; todavia no esta en el CI.
- `npm run seed:dev` fallo en esta maquina (no se investigo); los E2E no dependen de el.

Restricciones y riesgos a tener en cuenta (no son bugs para arreglar ya).

## El contexto se desincroniza si nadie fuerza el proceso
Si se edita código sin actualizar `.ai/context/` (y la spec) en el mismo cambio, los docs mienten. `/cambio` y `/cerrar` existen para forzarlo; sin esa disciplina el riesgo vuelve.

## El constructor de consultas no es PostgREST completo
`src/lib/db/builder.ts` cubre solo los operadores y embeds que usa el código. Una relación ambigua (dos FK entre las mismas tablas) exige `rel!nombre_fk`. Agregar un operador nuevo se hace en `cond()`; los embeds no se soportan dentro de `returning` (insert/update + select).

## Una sola réplica de la app
El rate limit de login/reset (`src/lib/rate-limit.ts`) vive en memoria del proceso. Con varias réplicas el límite se multiplica.

## La app se conecta con el mismo usuario que migra
`DATABASE_URL` es el dueño de la base (superusuario en el contenedor oficial) y cambia de rol con `SET LOCAL ROLE`. RLS sigue vigente, pero un usuario de conexión sin superusuario sería más seguro (pendiente).

## Las sesiones son cookies firmadas sin tabla
No hay revocación individual: se invalidan todas las de un usuario con `auth.users.sesion_desde` (se actualiza al cambiar la contraseña) o desactivando la cuenta. Cambiar `SESSION_SECRET` cierra todas.

## Sin tests automáticos de UI ni de políticas RLS
La CI verifica tipos, build, migraciones, RLS activo en todas las tablas y que un alta sin invitación no cree perfil. No prueba las políticas por rol ni las pantallas.

## El mail depende de SMTP
Invitaciones, recuperación de contraseña y avisos salen por `src/lib/mail.ts`. Sin `SMTP_HOST`/`MAIL_FROM` no se envía nada (el alta del usuario queda hecha, pero nadie recibe el link): configurarlo antes de invitar en cada entorno.

## Cuentas y secretos
`docs/CUENTAS-HOMOLOGACION.md`, `.env.test` y `.env.production` están gitignored. Nunca pegar claves en el chat ni en commits.

## Sin verificar en navegador tras la auditoría
La CSP (`next.config.js`) y la reactivación de cuentas (`ban_duration: 'none'` en `setEstadoCuenta`) se probaron solo por código y headers. Revisar en homologación que no bloqueen imágenes ni el iframe del PDF, y que un usuario reactivado pueda entrar.

## Rate limit en memoria
`src/lib/rate-limit.ts` cuenta por instancia serverless (mejor esfuerzo). Para un límite real hace falta un store compartido (tabla en Postgres o Upstash).

## Respuestas de encuesta por número de pregunta
Se guardan por índice, no por id. Por eso `guardarEncuesta` bloquea cambiar las preguntas de una encuesta con respuestas. Un id estable por pregunta lo resolvería.

## Sin hacer de la auditoría
`ImageUploader` y los formularios públicos (`ContactForm`, `DemandaForm`, `AuthForms`) no usan `ActionForm`. El `bodySizeLimit` de 26 MB sigue global (los PDFs lo necesitan). El ZIP se arma en memoria.

## Abiertos tras la sesión 2026-10-13
- **RF-39 figura 🟢 y no está en el código**: al finalizar una edición no se envía ningún mensaje recomendando el siguiente nivel. Quedó fuera a propósito; falta decidir si se implementa o se corrige el estado en la spec.
- **Sesión cerrada por cambio de contraseña → «Tu cuenta no está activa»**: la otra sesión cae en `/login?error=cuenta`, cuyo mensaje habla de cuenta inactiva. Pasa igual al recuperar la contraseña por mail; convendría un mensaje propio («Tu sesión venció»).
- **El plazo de acceso de las inscripciones ya finalizadas** arranca el día que se aplica la 0018 en cada entorno, así que la fecha de vencimiento puede diferir entre homologación y producción.
- **Límite de intentos del cambio de contraseña** en memoria y por instancia, igual que el del login.

## Abiertos tras la sesión 2026-10-11
- **Scripts `npm run db:*` / `seed:*` en Windows**: usan `ENV_FILE=… comando`, que `cmd` no entiende, y `scripts/migrate.mjs` no carga un `.env` con fin de línea CRLF («Falta DATABASE_URL»). Rodeo en Git Bash: exportar las variables (`set -a; . <(tr -d '\r' < .env.development); set +a`) y correr `node scripts/migrate.mjs` / `npx tsx scripts/seed-pruebas.mts --confirmo-no-produccion`.
- **Guardar la estructura de una edición sin cambios la deja «personalizada»** (se copia la guía igual). No rompe nada; «Volver a la guía general» la devuelve.
- **La regla de «edición terminada» está en dos lugares**: `momentoEdicion()` (`src/lib/fechas.ts`) y `fin_edicion()`/`edicion_vigente()` (0017, `fin_edicion` redefinida en la 0020). Si cambia una, cambiar la otra.
- **Borrar físicamente una edición** borra en cascada las filas de su material propio pero no los archivos del disco. Hoy las ediciones solo se dan de baja.

## Abiertos tras la sesión 2026-10-05
> Histórico: los ítems sobre Vercel, Supabase («Migraciones a Supabase», `db:push:*`, base compartida con la demo) quedaron superados el 2026-10-09, cuando se sacó Supabase. Siguen vigentes las fotos de ejemplo, la prueba en navegador y las cuentas viejas de homologación. (aulas)
- **Acciones de `<form action>` simples descartan el error**: `bajaCurso`, `setEstadoCuenta`. Si la base las rechaza, la página se recarga sin mostrar el motivo. Usar `ActionForm` en un modal, como ya hacen «Reactivar» curso y la baja de aulas.
- **`npm run seed:dev` no anda desde cmd/PowerShell**: el script npm usa `ENV_FILE=…` (sintaxis POSIX). Desde el 2026-10-06 el seed tolera `.env` con CRLF y ya no escribe en `/dev/null` (solo guarda credenciales si hay `CREDS_OUT`). Rodeo: desde Git Bash, `ENV_FILE=.env.development node scripts/seed-pruebas.mjs --confirmo-no-produccion`.
- **`db:reset` no prueba migraciones con datos**: aplica todo sobre una base vacía. Una migración que actualiza filas y después hace `ALTER TABLE` puede fallar recién en homologación (le pasó a la 0013 con un trigger diferido). Antes de aplicar a mano: base local en la versión de homologación, seed viejo y correr el script encima.
- **No correr `npm run build` con `npm run dev` prendido**: los dos escriben en `.next` y el servidor de desarrollo empieza a fallar (módulos que no encuentra, server actions con «Invalid URL»). Apagar el dev, `rm -rf .next` y volver a levantarlo.

## Abiertos tras la sesión 2026-10-05
- **Fotos de ejemplo**: las imágenes de cursos/talleres del seed son flyers viejos de `public/images` (mencionan «4 cuotas», precios y «mes de junio»). Chocan con la regla «sin pagos/cuotas» y no corresponden a cada curso: reemplazar por fotos finales (con consentimiento).
- **Sin probar en navegador**: pestaña Material del curso (admin) y la ficha pública de cada taller en tablet más allá de lo medido.
- **Cuentas viejas en homologación**: se borraron a mano con SQL (los triggers impiden borrar inscripciones). Si reaparecen cuentas `@homologacion.example.com`, repetir.
- **Deploy de Vercel**: los deploys automáticos de Git fallaron con «Builder returned invalid routes». La causa hallada fue la `ñ` en `añadirAlumno` (arreglada), pero **no se confirmó** que el deploy de la nube ya pase; revisar el próximo build.
- **Homologación comparte base con la demo del cliente** (`main` en Vercel). Una migración que cambia estructura (como la 0011) rompe la demo si llega antes que el código: aplicarla **justo después** del deploy de `main`. Las que solo agregan (como 0009 y 0010) se pueden aplicar antes.
- **Acción «Migraciones a Supabase»** falla en `test` y `main` por falta del secreto `SUPABASE_DB_URL` (el admin del repo no puede dar acceso; lo tiene que cargar él). Mientras tanto las migraciones se aplican **a mano en el SQL Editor**, con un script en transacción que verifique la migración previa y registre la nueva en `supabase_migrations.schema_migrations` (si no se registra, el workflow intentará aplicarla de nuevo el día que tenga el secreto).
- **`npm run db:push:*` no anda en Windows**: `scripts/db-push.mjs` lanza `npx` sin shell y falla con `ENOENT`. Rodeo: `npx supabase db push --db-url "$SUPABASE_DB_URL" --dry-run` (y sin `--dry-run` para aplicar).


## Auditoría de dependencias (2026-10-15)
`npm audit --omit=dev --audit-level=high` en 0 (Next 15.5.28, `overrides.next.postcss` 8.5.30, `@playwright/test` 1.64.1, sharp actualizado). Si se actualiza Next y reaparece el `postcss` viejo, borrar `node_modules/next/node_modules/postcss` del `package-lock.json` y reinstalar. Las entradas sobre «Migraciones a Supabase» y `db:push:*` de arriba son históricas (ya no hay Supabase).

## Auditoría 2026-10-21 — pendientes (rama `fix/auditoria-seguridad-logica`)
Hecho en esa rama: S1-S7 (IP, rate limit, sesión de activación, logout), L1 (finalizado final, 0019), L5 (0020), L6, U1 (imágenes) y vigencia de tokens. El resto, por prioridad. Los hallazgos salen de leer el código (sin mediciones ni `EXPLAIN`): confirmar la línea citada antes de arreglar.

**Seguridad.** `audit_log`: insert abierto a `authenticated` y PII en el JSON (0003). CSP con `unsafe-inline` (`security-headers.ts`). `/api/media` lee el body entero antes de limitar (`route.ts:17`). Confirmar que Traefik pisa `x-real-ip`. Revisar que `.env.development` (versionado) no tenga secretos reales. Sin auditar: `npm audit`, workflows, `scripts/`, políticas de 0011/0017/0018.

**Lógica.** `guardarClases` no atómico (RPC con `for update`); aviso RF-38 manual y sin reintento; trigger de deserción escribe una fila de `audit_log` por desertor por clase; validación solo en cliente (`actualizarPerfil`, `guardarItemCms`, `guardarSetting`, `datosEdicion` sin chequear rol del profesor, `duplicarEdicion`, `slugify` vacío); `guardarEncuesta` (parser de `|`, cambio de edición con respuestas); `cambiarEmail` en dos pasos; acciones `<form action>` que tragan errores; `finalizarEdicion` sin validar ni auditar; horarios solapados; migraciones sin advisory lock. Tests: no hay de reglas de negocio; el artefacto de CI de `ci.yml:36` no sube nada (`\n` literal); `webServer` de Playwright con 120 s.

**Estilos y accesibilidad.** Foco anulado en inputs (`outline-hidden`); bordes de controles a ~2:1 (WCAG pide 3:1); video hero sin `prefers-reduced-motion`; salto h1→h3 en `/cursos`; iconos sin `aria-hidden`; colores fuera de tokens (`--rp-*` duplicados, red/green/amber de Tailwind); galería 4:3 fijo (CLS).

**SEO.** `openGraph` heredado de la home en todas las páginas; sin canonical, `og:image`, `twitter:card` ni JSON-LD; descripciones cortadas o ausentes (`galeria`, `cursos`); `NEXT_PUBLIC_SITE_URL` cae a localhost sin validar; sitemap sin `lastModified` y `force-dynamic`; `robots` bloquea rutas que ya tienen `noindex`; `loading.tsx` raíz renderiza `<main>`.

**Rendimiento.** (1) Cada consulta son 4 viajes (BEGIN, `set_config`, query, COMMIT) en `src/lib/db/index.ts:20`: mandar `set_config` y la query en pipeline. (2) `perfilDeSesion` x3-4 por navegación y `encuestasPendientes` x2: envolver en `cache()`. (3) Todo el sitio público es `force-dynamic` + `connection()`, sin caché: `unstable_cache` con tags e invalidación desde las actions del CMS. (4) ZIP armado en memoria (`api/curso/[id]/zip`) y PDF sin streaming ni `Range` (`api/material/[id]`). (5) RLS llama funciones `SECURITY DEFINER` por fila: envolver en `(select fn())` en una migración nueva. (6) Reportes del admin agregan tablas enteras en JS (O(n²)). (7) `motion/react` completo en el sitio público (`LazyMotion`). (8) FKs sin índice (`encuestas.edicion_id`, `encuesta_respuestas.encuesta_id`, `cms_testimonios.curso_id`, `profiles.rol`). (9) SMTP sin pool, un transport por mail. (10) Sin volumen para `.next/cache` (se pierde el caché de imágenes en cada deploy). Sin revisar: `password-hash.ts` (¿scrypt sync?), tamaño de los componentes cliente del campus.
