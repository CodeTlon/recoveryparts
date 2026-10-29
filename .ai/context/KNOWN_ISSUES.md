# KNOWN_ISSUES — Recovery Parts

## Vigente (2026-10-16)
- `npm audit` completo conserva 5 altas de herramientas de desarrollo: `braces` <= 3.0.3 via `eslint-config-next` -> `fast-glob` -> `micromatch`. Sin version corregida publicada; no entra al runtime (`npm audit --omit=dev` = 0). El override `next.postcss` se retiro (Next 16.4.2 ya trae un `postcss` corregido).
- ESLint se incorporo el 2026-10-16: 66 avisos, 0 errores. 58 son `@typescript-eslint/no-explicit-any` (el acceso a datos con `postgres.js` usa `any`), 2 `react-hooks/refs`, el resto reglas de React nuevas. Deuda; todavia no esta en el CI.
- ~~`npm run seed:dev` fallo en esta maquina~~: resuelto el 2026-10-27. En una base nueva dejaba todo sin aula (las aulas base solo las carga `db/seed.sql`); ahora el seed las crea (`ERRORES.md`).

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
No hay revocación individual: se invalidan todas las de un usuario con `auth.users.sesion_desde` (se actualiza al cambiar la contraseña, **al cerrar sesión** y al desactivar la cuenta). Cerrar sesión en un dispositivo la cierra en todos. Cambiar `SESSION_SECRET` cierra todas. Tras abrir un link de invitación/recuperación hay una sesión de **activación** (claim `act`, 15 min) que no entra al campus.

## Sin tests automáticos de UI ni de políticas RLS
La CI verifica tipos, lint, build, migraciones, RLS activo en todas las tablas, que un alta sin invitación no cree perfil, **las reglas de negocio de la base** (`tests/db/reglas.sql`: cupo, estados finales, N° de clase, encuesta anónima, RLS por rol) y **E2E con base** (`tests/e2e/auth.spec.ts`: invitación, activación, rol, logout; `csp.spec.ts`). No cubre las pantallas del campus por rol ni las acciones del admin.

## El mail depende de SMTP
Invitaciones, recuperación de contraseña y avisos salen por `src/lib/mail.ts`. Sin `SMTP_HOST`/`MAIL_FROM` no se envía nada (el alta del usuario queda hecha, pero nadie recibe el link): configurarlo antes de invitar en cada entorno.

## Cuentas y secretos
`docs/CUENTAS-HOMOLOGACION.md`, `.env.test` y `.env.production` están gitignored. Nunca pegar claves en el chat ni en commits.

## Sin verificar en navegador tras la auditoría
La CSP ahora es con nonce (`src/proxy.ts`): se verificó en Chromium contra el sitio y el campus del admin (sin violaciones; modales y menú móvil andan). **Sin verificar:** el iframe/visor de PDF y el ZIP en homologación. La página `/_not-found` es estática y sus scripts no llevan nonce (queda sin hidratar; es solo un enlace).

## Rate limit en memoria
`src/lib/rate-limit.ts` cuenta por instancia (mejor esfuerzo; ya no se resetea de golpe al llenarse: descarta las claves más viejas). La IP sale de `src/lib/ip-cabeceras.ts`: `TRUSTED_IP_HEADER` si está, si no el **último** valor de `x-forwarded-for` (el que agrega el proxy; el primero y `x-real-ip` los puede mandar el cliente). Probado con `tests/unit/ip.test.ts`. Con un CDN delante hay que definir `TRUSTED_IP_HEADER`. Para un límite real entre réplicas hace falta un store compartido.

## Respuestas de encuesta por número de pregunta
Se guardan por índice, no por id. Por eso `guardarEncuesta` bloquea cambiar las preguntas de una encuesta con respuestas. Un id estable por pregunta lo resolvería.

## Sin hacer de la auditoría
`ImageUploader` y los formularios públicos (`ContactForm`, `DemandaForm`, `AuthForms`) no usan `ActionForm`. El `bodySizeLimit` (30 MB desde el 2026-10-27, junto con `proxyClientMaxBodySize`) sigue global: los PDFs lo necesitan. Un archivo de más de 30 MB que esquive el aviso del navegador vuelve a dar 500. El ZIP y los PDF ya van por streaming.

## Abiertos tras el rediseño (2026-10-28, v0.17.0)
- **Actualizado 2026-10-29 (v0.17.1):** el canvas dibuja en un Web Worker y Archivo pesa 32 KB menos; la portada da 64–68 (4 corridas) y `/cursos` 73–78. Probando con todo el movimiento apagado da casi lo mismo (67–68): lo que queda de TBT (~0,8–1 s) es la hidratación de React/Next medida en esta VPS lenta (`benchmarkIndex` ≈ 1180; una PC común da más). Se probó `experimental.inlineCss` y se descartó: Next 16.4 mete el CSS en el HTML y otra vez en los datos de React (HTML de 34 → 80 KB) y empeoró el FCP.
- **Rendimiento móvil de la portada ~8 puntos debajo de `dev`** (Lighthouse celular simulado, 3 corridas: `dev` 66–78, rediseño 60–71; LCP ≈ +0,5 s por *render delay* del hilo principal). Causa: los efectos interactivos (canvas, inclinación, magnetismo). `/cursos` quedó igual o mejor; la ficha del curso, parecida (72–79 vs 74–86). Accesibilidad, SEO y buenas prácticas en 100, CLS 0. Si hace falta recuperar: no montar el `CircuitField` del cierre de la portada o bajar la densidad de pistas en celular.
- **El fondo animado no tiene botón de pausa** (decisión de producto, ver `DECISIONS.md`): no cumple estrictamente WCAG 2.2.2. Con `prefers-reduced-motion` queda quieto.
- **CSS moderno con alternativa**: animaciones atadas al scroll (`animation-timeline`), `interpolate-size` y View Transitions no existen en todos los navegadores; donde faltan, el contenido se ve completo y quieto. Firefox/Safari los cubre el job `navegadores` de la CI (no corren en la VPS).
- **El morph de foto tarjeta → ficha** solo se ve cuando la ficha ya está en caché del router; si la página tarda, entra con un fundido.
- `next dev` agrega solo un bloque «nextjs-agent-rules» a `AGENTS.md` (Next 16.4); no se commiteó. Se apaga con `agentRules: false` en `next.config.js` si molesta.

## Abiertos tras la QA del campus (2026-10-27)
Detalle y propuestas en `docs/AUDITORIA-2026-10-27.md`. Resumen: confirmación de «mantener apretado» poco descubrible; un aula no se puede dar de baja si la usa una edición ya terminada (siguen `activo`); el «no encontrado» del campus responde HTTP 200; galería pública, CMS y el selector de ediciones de Encuestas sin límite; portada pesada en el celular (medir en producción); página del curso del profesor muy larga; sin promedio de las preguntas de puntaje; aviso de Turbopack por acceso dinámico al disco en `storage.ts`.

## Abiertos tras la sesión 2026-10-21 (aulas)
- ~~**Los permisos por defecto de `anon` vuelven en cada migración.**~~ Resuelto el 2026-10-27: el bootstrap ya no se los da (`ERRORES.md`). `scripts/migrate.mjs` corre `db/bootstrap.sql` siempre, y ese archivo hace `alter default privileges … grant all on tables to anon`, que deshace el `revoke` por defecto de la 0028. Toda tabla o vista creada después de la 0028 queda con todos los permisos para `anon`; hoy no se filtra nada porque sin política para `anon` RLS devuelve 0 filas, pero la protección queda en una sola capa. La 0030 lo revoca a mano en sus objetos. Arreglo de fondo: que el bootstrap no vuelva a dar permisos por defecto a `anon` (o que la 0028 se reaplique al final).
- **Tope de 25 MB para el video general de «Aulas»** (el de subida del sitio, después de comprimir): un recorrido largo puede no entrar. El campo pide 1–2 minutos.
- **Las anclas del índice de «Aulas» salen del nombre del aula**: si se renombra en Campus › Aulas, cambian.

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

## Auditoría 2026-10-21 (rama `fix/auditoria-seguridad-logica`)
Cuatro revisiones de solo lectura (seguridad, lógica, estilos/SEO, rendimiento) y las correcciones, incluidos los cambios de más riesgo (no hay producción) y todo lo que había quedado pendiente. Probado en una base descartable con 40.000 inscripciones y en Chromium.

**Hecho:** rate limit e IP configurable, sesión de activación y logout con revocación, finalizado como estado final (0019), fin de edición con duración (0020), índices (0021), calendario atómico, con detección de versión y con avisos pendientes con reintento (0022, 0026, 0029), validaciones de datos (0023), **RLS sin funciones por fila (0024, 0025: admin 10 s → 13 ms, profesor 23 s → 34 ms)**, locks de agenda y horarios solapados (0027), **`anon` con permisos mínimos (0028)**, CSP con nonce, caché del sitio público, ZIP/PDF por streaming, video (MP4 y WebM) recomprimido en segundo plano, pool SMTP, volumen para `.next/cache`, paginación del admin, SEO, tokens de estado y contrastes, `.env.development` desversionado, CI con lint, unitarios, E2E con base, pruebas SQL y un job de Firefox y Safari.

**Fallas que ya existían en `dev` y se corrigieron** (las destapó probar de verdad): `/activar` salía estática en el build y siempre decía «El link venció»; los **formularios públicos de contacto y de demanda fallaban siempre** (el builder agregaba `RETURNING`); la **búsqueda de usuarios del admin no devolvía nada con ningún término** (`cond` validaba la lista de columnas como un identificador y el error quedaba invisible: ahora el builder lo registra en el log); un **curso inexistente respondía 200** (el `loading.tsx` raíz hacía empezar a enviar la página antes de `notFound()`: se quitó, no volver a ponerlo).

**Falsos positivos de los agentes (verificados):** `audit_insert` abierto y PII en `audit_log` (ya resuelto en la 0007), «assets muertos» de `public/images` (los usan los seeds y el contenido demo), íconos sin `aria-hidden` (lucide los marca solos), `scrypt` sincrónico (es asíncrono), drawer del campus sin trampa de foco (ya tiene `useModalFocus`).

**Verificado además:** visor de PDF del alumno bajo la CSP en Chromium completo; 61 mails con 3 conexiones SMTP; dos migradores simultáneos; alta simultánea de ediciones solapadas; envío de avisos pendientes con el SMTP caído y luego levantado; imagen Docker (construye, arranca, healthcheck, optimizador y caché persistente); la imagen no contiene ningún `.env`; los workflows pasan las entradas por `env`.

**Resuelto:** `.env.development` estaba versionado con una `DATABASE_URL` con credenciales y un `SESSION_SECRET` de 55 caracteres (los valores no se leyeron). Se desversionó (`git rm --cached`, regla en `.gitignore`); queda `.env.development.example` y `npm run setup:dev` (crea el archivo con un secreto aleatorio). **El historial de git conserva el archivo viejo** (no se reescribe historia): si ese `SESSION_SECRET` se usó en algún entorno desplegado, hay que rotarlo; las credenciales de la base son las del compose de desarrollo.

**Incidente de despliegue (2026-10-21):** el recurso de producción de Coolify apuntaba a `/docker-compose.yml` (compose de desarrollo, solo Postgres) en vez de `/docker-compose.coolify.yml`; al redesplegar solo arrancó la base, `app` no se construyó y el servicio perdió su dominio. Se corrigió en el panel. Si `test` se creó igual, revisar *Docker Compose Location*. Quedó advertido en `docs/DESPLIEGUE-COOLIFY.md`.

**Pendiente / descartado con datos:**
- *Verificado luego:* Firefox y Safari (no corren en la VPS: faltan librerías y no hay `sudo`) pasaron en el job `navegadores` de la CI (CSP con nonce, acceso y smoke) y la producción se desplegó y funciona. *Sin verificar:* el recurso de `test` en Coolify y la cabecera de IP detrás del Traefik real (configurable con `TRUSTED_IP_HEADER`, probada con tests unitarios).
- `LazyMotion`: probado y **empeora** (home 202 → 207 KB, login 149 → 196 KB de JS gzip): descartado.
- `/_not-found` (404 de URLs que no existen) es estático y sus scripts no llevan nonce: no hidrata y la consola registra violaciones de CSP, pero solo contiene un enlace. Una ruta comodín dinámica lo arreglaba pero convertía el 404 en un 200 (soft-404): peor, descartado.
- Las listas del CMS (FAQ, galería, testimonios, egresados) no se paginan: son curadas y chicas.
- El logo en paleta (PNG indexado) pesa 45 KB pero degrada la imagen (diferencia medida alta): se queda en 512 px / 123 KB.
- Al reenviar avisos de clases tras una falla parcial, quienes ya lo recibieron lo reciben de nuevo (no se guarda el estado por destinatario).
- `ListEditors` y `CursoForm` (componentes cliente del campus) no se revisaron por tamaño.
