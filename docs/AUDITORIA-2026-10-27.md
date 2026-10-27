# Casos de prueba del campus y auditoría — 2026-10-27

Rama `feature/dev2-qa-campus` (desde `dev` en `8343a8a`, igual en contenido a `test` y `main`). Se corrieron los **102 casos** de «Casos de prueba — Campus» (actualizado el 26/10/2026) y se auditó el sitio: SEO, rendimiento, UX/UI, estilos, accesibilidad, seguridad, paginación y claridad para usuarios nuevos.

## Cómo se probó
- Base local de QA (Postgres 16 en Docker rootless, puerto 42520) con `migrate.mjs --seed` + `seed:dev`, y un capturador de mails (Mailpit) como SMTP: los casos de mail se verificaron con el mail real recibido.
- App en modo producción (`next build` + `next start`, puerto 42530).
- Cada caso, automatizado con Playwright (Chromium) sobre la interfaz real: login de verdad, formularios enviados como los envía el navegador. La validación HTML se salteó para probar la del servidor, y las precondiciones se armaron con SQL. Antes de cada corrida, la base se rehizo desde cero.
- Suite del repo: `type-check`, `lint`, `spec:lint`, `test:unit`, `tests/db/reglas.sql`, E2E (3 viewports), `npm audit --omit=dev`.
- Lighthouse 12.6 en celular (CPU simulada 4× más lenta, sobre una VPS ARM: los números absolutos salen inflados; sirven para comparar antes y después) y axe-core (WCAG 2.1 AA) en 14 pantallas del campus.

## Resultado de los casos
| Corrida | OK | Falla |
|---|---|---|
| `dev` sin cambios | 100 | 2 (CP-MAT-06, CP-AUL-02) |
| Con los arreglos de esta rama | 102 | 0 |

## Hallazgos corregidos en esta rama
| # | Severidad | Área | Hallazgo | Arreglo |
|---|---|---|---|---|
| 1 | Alta | Material | **Todo PDF de más de 10 MB daba 500** sin mensaje (el formulario promete 25 MB). Con más de 25 MB tampoco salía «supera los 25 MB» (CP-MAT-06). Causa: el proxy corta el cuerpo en 10 MB. | Topes de 30 MB en el proxy y en las server actions; aviso en el navegador antes de enviar. E2E de regresión. |
| 2 | Alta | Admin | **Campus › Aulas no listaba ninguna aula** («Todavía no hay aulas cargadas»): no se podía editar ni dar de baja un aula desde el campus (CP-AUL-02). La consulta usaba `aulas → cursos`, que no existe desde la 0011. | La página lee las ediciones de cada aula. E2E de regresión. |
| 3 | Media | Seguridad | `db/bootstrap.sql` (corre en cada arranque) devolvía a `anon` **todos los permisos por defecto** sobre las tablas nuevas, deshaciendo la 0028. RLS lo contenía, pero quedaba una sola capa. | El bootstrap ya no se los da y los revoca; una base afectada se corrige sola en el próximo arranque. Verificado: permisos explícitos de `anon` idénticos. |
| 4 | Media | Seguridad | `nodemailer` 10.1.2 con 3 avisos moderados del parser de direcciones (GHSA-8c8m-p3m8-cjg8, GHSA-m943-m63m-w62w, GHSA-85x2-q946-cp5h). | 10.1.7 (parche de la misma línea). `npm audit --omit=dev` en 0. |
| 5 | Media | Desarrollo | En una base nueva, `seed:dev` dejaba **todos los cursos sin aula** y «Aulas» vacía, sin error. Probable causa del «seed falló en esta máquina» de KNOWN_ISSUES. | El seed crea las aulas base (upsert). |
| 6 | Media | UX / acceso | Una cuenta deshabilitada con la contraseña correcta «entraba»: la barra quedaba en `/campus/alumno` mostrando el login. | El login lo rechaza con «Tu cuenta no está activa. Contactá a la academia.» |
| 7 | Media | Rendimiento | `Reveal` (con `motion`) mandaba desde el servidor los bloques con `opacity: 0` hasta que hidrataba el JS, y `motion` (≈50 KB comprimido) se cargaba en todo el sitio público. | `Reveal`, `BlurText`, `CountUp` y el subrayado del menú pasan a CSS + `IntersectionObserver`; lo que está a la vista al cargar nunca se oculta. `motion` queda solo en el campus. |
| 8 | Media | UX | En el celular, la ficha del curso mostraba precio, fechas y «Consultar por WhatsApp» **al final**, después del plan, el profesor, el kit y las opiniones (~3.000 px de scroll). | En el celular ese bloque va primero, después de la foto (en escritorio no cambia). |
| 9 | Baja | Accesibilidad | Campos sin nombre accesible en los editores de horarios (Día/Desde/Hasta), kit y destacados de aulas; `<dl>` mal armado en las cifras de la portada; `<div>` entre `<ul>` y `<li>` en Usuarios, Aulas y el material del alumno. | Etiquetas asociadas, `<dl>` con grupos `dt`/`dd`, `Reveal as="li"`. axe: 0 violaciones en las 14 pantallas; Lighthouse a11y 100 en el sitio. |
| 10 | Baja | SEO | El layout raíz declaraba `canonical: '/'` y lo heredaban `/login`, `/activar`, etc. La imagen del LCP iba en carga diferida en la galería y el login. | Canonical solo en la portada; prioridad a la primera fila de la galería y al logo del login. |
| 11 | Baja | UI | El pie de página no listaba «Aulas»; el profesor sin foto se veía como un círculo vacío. | «Aulas» en el pie cuando hay aulas visibles; iniciales del profesor. |

### Lighthouse (celular), antes → después
| Página | Rendimiento | LCP | Bloqueo (TBT) | JS | Accesibilidad | SEO |
|---|---|---|---|---|---|---|
| `/` | 45 → 48 | 5,9 → 5,4 s | 4,2 → 3,3 s | 203 → 149 KB | 93 → 100 | 100 |
| `/cursos/reparacion-de-celulares` | 78 → 87 | 3,2 → 2,0 s | 580 → 480 ms | 196 → 149 KB | 100 | 100 |
| `/aulas` | 56 → 74 | 4,3 → 1,4 s | 3,9 → 1,5 s | 197 → 150 KB | 100 | 100 |
| `/galeria` | 54 → 55 | 4,7 → 4,7 s | 2,5 → 2,2 s | 197 → 150 KB | 100 | 100 |

`/login` queda en SEO 61–66 a propósito (`noindex`). Buenas prácticas: 100 en todas.

## Revisado y en orden
- **Seguridad:** CSP con nonce y `strict-dynamic`, HSTS, `nosniff`, `frame-ancestors`, `Referrer-Policy`; cookie de sesión `httpOnly`, `SameSite=Lax`, `Secure` en producción; mensaje de login genérico (CP-ACC-02); límite de intentos (CP-CTA-05); revocación de sesiones al deshabilitar y al cambiar la contraseña (CP-ACC-09, CP-CTA-04); `/api/material` sin sesión → 401, sin acceso → 404 (CP-MAT-11 a 13); `/api/media` solo admin, con control de origen y tope leído por tramos; sin registro público (CP-ACC-12); reglas de la base (`reglas.sql`) OK; encuestas sin `alumno_id` en las respuestas (CP-ENC-09).
- **SEO:** `robots.txt` (bloquea `/campus`, `/api`, `/auth`) y `sitemap.xml` con el dominio de `NEXT_PUBLIC_SITE_URL`, con `/aulas` solo si hay aulas visibles; título, descripción, canonical, Open Graph y Twitter por página; JSON-LD de curso y de preguntas frecuentes; 404 real para cursos y rutas inexistentes.
- **Paginación:** Usuarios, Consultas y Encuestas del admin paginan de a 25 conservando filtros.

## Propuestas (sin implementar: decisión de producto o cambio grande)
1. **Confirmación de «mantener apretado ~1 s»** (dar de baja, finalizar, borrar): con un clic corto solo aparece «Mantené apretado». Para alguien nuevo no es descubrible. Propuesta: confirmación con un clic en un modal, como ya hace el teclado.
2. **Un aula no se puede dar de baja si la usa una edición activa aunque ya haya terminado** (las ediciones terminadas siguen con `activo = true`; en el seed, Aula 3 la frena «Taller de Cambio de Glass · 09/2026»). Propuesta: contar solo ediciones no terminadas (migración nueva).
3. **Páginas «no encontrado» del campus responden HTTP 200** (soft-404 por el `loading.tsx` del campus). No afecta el SEO (el campus es `noindex` y está bloqueado en robots), pero confunde el monitoreo.
4. **Listas sin límite:** la galería pública y las pestañas del CMS cargan todo; el selector de edición en Encuestas lista todas las ediciones históricas (crece con cada dictado); la lista de ediciones de cada curso no pagina. Hoy son chicas; conviene «Ver más» en la galería y filtrar el selector a las ediciones activas.
5. **Portada pesada en el celular:** ~10.000 px de alto, 3,3 s de bloqueo y 1,2 s de estilos/layout con la CPU simulada. Medir en producción con PageSpeed Insights y evaluar recortar o diferir secciones (cinta de testimonios, egresados).
6. **Página del curso del profesor muy larga** (material, calendario y estructura en una sola página): pestañas o un índice con anclas ayudarían a alguien que la usa por primera vez.
7. **Resultados de encuestas:** el admin ve los textos, pero para las preguntas de puntaje no hay promedio ni distribución visibles.
8. **Build:** el aviso de Turbopack «Dynamic filesystem access causes tracing of the whole project» (`src/lib/storage.ts`) ya estaba; la imagen standalone pesa 88 MB. Lint: 62 avisos previos, 0 errores.
9. El documento de casos cita `docs/CUENTAS-HOMOLOGACION.md`, que no existe en el repo.

## Sin verificar
- Homologación (`test` en Coolify) y producción: todo se probó en local.
- Firefox y Safari (no corren en esta VPS; los cubre el job `navegadores` de la CI).
- Un SMTP real (se usó Mailpit) y el video general de «Aulas» (el seed no trae video: el reproductor con controles y sin autoplay se revisó solo en el código).

## Registro de ejecución (2026-10-27, rama `feature/dev2-qa-campus`, local)

Probado por: Claude (automatizado con Playwright sobre la interfaz, base de QA local).

| ID | Resultado | Observaciones |
|---|---|---|
| CP-ACC-01 | OK | — |
| CP-ACC-02 | OK | Mensaje: «Email o contraseña incorrectos.» |
| CP-ACC-03 | OK | — |
| CP-ACC-04 | OK | — |
| CP-ACC-05 | OK | — |
| CP-ACC-06 | OK | — |
| CP-ACC-07 | OK | URL del B: pantalla 404 «No encontramos esa página» (HTTP 200) |
| CP-ACC-08 | OK | URL del B: pantalla 404 «No encontramos esa página» (HTTP 200) |
| CP-ACC-09 | OK | Al recargar → /login; al reingresar: «Tu cuenta no está activa. Contactá a la academia.» |
| CP-ACC-10 | OK | Cerrar sesión desde el menú; Atrás + recargar → /login |
| CP-ACC-11 | OK | Entró a /campus/alumno; link reusado: «El link venció Los links se pueden usar una sola vez y vencen.» |
| CP-ACC-12 | OK | — |
| CP-CUR-01 | OK | Aparece en el admin y en /cursos al instante |
| CP-CUR-02 | OK | Poné un nombre de hasta 120 caracteres. / El precio tiene que ser un número entre 0 y 100.000.000. / El descuento debe estar entre 0 y 100%. / La duración debe ser de 1 a 104 semanas. |
| CP-CUR-03 | OK | Tras editar descripción: 2026-01-01; tras cambiar precio: 2026-10-27 |
| CP-CUR-04 | OK | Ficha pública → 404; agregar alumno: «La edición no existe o está dada de baja.» |
| CP-CUR-05 | OK | Sin choques: reactivó y volvió al sitio |
| CP-CUR-06 | OK | «No se pudo completar la operación.» / «No se pudo completar la operación.» |
| CP-CUR-07 | OK | Creada (redirige a Horarios) y con horario mié 10-12 |
| CP-CUR-08 | OK | «Hay superposición de aula o profesor en ese día y horario.» |
| CP-CUR-09 | OK | aula/profesor/cupo iguales; horarios 1, alumnos 0, fechas 0 |
| CP-CUR-10 | OK | Mails a los 2 alumnos («Cambios en las clases de QA · Taller principal»); avisos pendientes: 0 |
| CP-CUR-11 | OK | Cartel: «Hay 1 clase suspendida o reprogramada sin avisar a los alumnos.»; al enviar, desaparece |
| CP-CUR-12 | OK | La otra edición y el curso no cambiaron |
| CP-CUR-13 | OK | Futura: «La edición todavía no empezó: no se puede finalizar.»; empezada: activo→finalizado, desertor sigue desertor |
| CP-INS-01 | OK | Inscripto; mail: «Activá tu cuenta de Recovery Parts» |
| CP-INS-02 | OK | Mail: «Te sumaron al curso QA · Taller principal — Recovery Parts» |
| CP-INS-03 | OK | «Alumno nuevo: completá nombre, apellido y un email válido.» / «Alumno nuevo: completá nombre, apellido y un email válido.» |
| CP-INS-04 | OK | «El alumno ya está en esta edición.» |
| CP-INS-05 | OK | «Ese email pertenece a un profesor o admin.» |
| CP-INS-06 | OK | «La cuenta de ese alumno está inactiva. Reactivala desde Usuarios antes de agregarlo.» |
| CP-INS-07 | OK | «La edición no tiene cupos disponibles.»; sin mails |
| CP-INS-08 | OK | «La edición ya terminó: no se pueden agregar alumnos.» |
| CP-INS-09 | OK | desertor, N° de clase 1 (se muestra en la fila) |
| CP-INS-10 | OK | «El motivo es obligatorio.» / «La fecha de deserción no puede ser futura.» |
| CP-INS-11 | OK | N° de clase: 2 → 1 |
| CP-INS-12 | OK | Acciones en la fila: Corregir fecha, ; la base rechaza volver a activo y borrar |
| CP-INS-13 | OK | «La edición no tiene cupos disponibles.» |
| CP-INS-14 | OK | Inicio muestra la baja; curso → pantalla 404 (HTTP 200); PDF → sin material liberado (encuesta: ver CP-ENC-10) |
| CP-MAT-01 | OK | — |
| CP-MAT-02 | OK | Lo ve y abre la vista previa (con el título); /api/material → 200 inline |
| CP-MAT-03 | OK | — |
| CP-MAT-04 | OK | — |
| CP-MAT-05 | OK | «El archivo no es un PDF válido.» / «El archivo no es un PDF válido.» |
| CP-MAT-06 | OK | 24 MB → HTTP 200, subido; 26 MB → HTTP 200, «El PDF supera los 25 MB.»; en `dev`: Falla (24 y 26 MB → HTTP 500 sin mensaje) |
| CP-MAT-07 | OK | «Poné un título de hasta 200 caracteres.» |
| CP-MAT-08 | OK | https guardado; «Link inválido (debe empezar con https://).» / «Link inválido (debe empezar con https://).» |
| CP-MAT-09 | OK | /api/material → 404 |
| CP-MAT-10 | OK | Sin opción de borrar (botones: LIBERAR AHORA); forzado: «No tenés permiso para borrar ese material, o ya no existe.»; el material sigue |
| CP-MAT-11 | OK | → 404 |
| CP-MAT-12 | OK | → 404 |
| CP-MAT-13 | OK | → 401 «No autorizado» |
| CP-MAT-14 | OK | Se descarga como «QA · Apunte liberado.pdf» |
| CP-MAT-15 | OK | Subido en Celulares (nov) y liberado; alumno1 en Celulares (sep) no lo ve |
| CP-MAT-16 | OK | → 200 application/zip (9.0 MB) |
| CP-ENC-01 | OK | Preguntas: puntaje,texto |
| CP-ENC-02 | OK | Poné un título y al menos una pregunta. / Poné un título y al menos una pregunta. / Elegí la edición: sin edición ningún alumno vería la encuesta. |
| CP-ENC-03 | OK | Figura en Encuestas y el curso muestra el aviso |
| CP-ENC-04 | OK | No la ve; por URL: pantalla 404 |
| CP-ENC-05 | OK | — |
| CP-ENC-06 | OK | Confirma: «Ya respondiste esta encuesta» |
| CP-ENC-07 | OK | «Respondé al menos una pregunta.» |
| CP-ENC-08 | OK | La pantalla ya no muestra el formulario: «Ya respondiste esta encuesta» |
| CP-ENC-09 | OK | 2 respuestas, sin nombres; columnas de respuestas: id,encuesta_id,respuestas,creado_en |
| CP-ENC-10 | OK | No la lista y por URL no hay formulario (pantalla 404) |
| CP-ENC-11 | OK | «Esta encuesta ya tiene respuestas: no se pueden cambiar las preguntas. Creá una encuesta nueva.» / «Esta encuesta ya tiene respuestas: no se puede cambiar de edición. Creá una encuesta nueva.» |
| CP-PRO-01 | OK | 2 tarjetas: en curso,próximo |
| CP-PRO-02 | OK | No figura; la URL muestra la pantalla 404 |
| CP-PRO-03 | OK | Desaparece de la lista y la URL muestra la pantalla 404 |
| CP-PRO-04 | OK | Sin «edición»; mensajes del calendario: «La clase «Clase 3» (01/01/2020) es anterior al inicio del curso (20/10/2026).» / «Guardado» |
| CP-PRO-05 | OK | Sin kit ni acción de deserción (solo la aclaración del calendario sobre el N° de clase de deserción) |
| CP-EST-01 | OK | «Sigue la guía general», igual a la guía, sin «Volver a la guía general» |
| CP-EST-02 | OK | «Personalizada para este curso»; fechas conservadas (3) |
| CP-EST-03 | OK | La guía y el otro dictado siguen sin los cambios |
| CP-EST-04 | OK | «La clase «QA · Clase renombrada» tiene fecha en el calendario. Sacala del calendario antes de borrarla.» |
| CP-EST-05 | OK | «El módulo «QA · Módulo vacío» no tiene clases.» |
| CP-EST-06 | OK | Advertencia: «Se van a perder los cambios que hiciste en la estructura de este curso y va a volver a la guía general. El material que subiste a clases que ya no existan queda como material general, y las fechas de esas clases se borran. CANCELAR CONFIRMAR»; al cancelar no cambia |
| CP-EST-07 | OK | Vuelve a «Sigue la guía general»; fechas 4 → 3 |
| CP-EST-08 | OK | El dictado sin cambios muestra el título nuevo; el personalizado no |
| CP-EST-09 | OK | La edición nueva sigue la guía general |
| CP-EST-10 | OK | Con el cambio figura «Estructura propia»; al volver a la guía, la etiqueta desaparece |
| CP-EST-11 | OK | D1: ve su clase propia; D2: sin clases listadas |
| CP-ALU-01 | OK | Entra directo al curso; aviso y botón Responder; menú «Encuestas 1 1 pendiente» |
| CP-ALU-02 | OK | Encuestas lista las dos con su curso; Mis cursos muestra «Tenés 2 encuestas…» sin listarlas |
| CP-ALU-03 | OK | Sin aviso; Encuestas: «Tus respuestas son anónimas: la academia no ve quién respondió qué. No tenés enc»; menú «Encuestas» |
| CP-ALU-04 | OK | Tarjeta: «Tenés acceso al material hasta el 27/1/2027 », Ver material y ZIP; el curso muestra el link y no «Próxima clase» |
| CP-ALU-05 | OK | «El acceso al material de este curso venció el 1/9/2026»; curso → 404; PDF → 404; ZIP → 403 «El acceso al material de este curso ya venció.»; 6 tarjetas en total |
| CP-ALU-06 | OK | Se pudo responder |
| CP-ALU-07 | OK | «Fuiste dado de baja de este curso el 27/10/2026 (clase 2). Motivo: QA Ya no tenés acceso al material de este curso. Si querés retomarlo, consultá por las próximas fechas.» |
| CP-CTA-01 | OK | Probado con alumno, profesor, admin: datos en solo lectura y la aclaración |
| CP-CTA-02 | OK | Sigue dentro; entra con la nueva; la vieja ya no sirve |
| CP-CTA-03 | OK | La contraseña actual no es correcta. / La contraseña debe tener al menos 8 caracteres. / Esa contraseña es demasiado común. Elegí otra. / La contraseña nueva tiene que ser distinta de la actual. / Las contraseñas nuevas no coinciden. |
| CP-CTA-04 | OK | La otra ventana vuelve al login; esta sigue dentro |
| CP-CTA-05 | OK | «Demasiados intentos. Esperá unos minutos e intentá de nuevo.» |
| CP-CTA-06 | OK | — |
| CP-AUL-01 | OK | Texto, índice (2), destacados con ícono, 5 fotos, sin capacidad ni cursos; el seed no trae video general (no se pudo ver el reproductor) |
| CP-AUL-02 | OK | Ninguna de las dos aparece; en `dev`: Falla (Campus › Aulas no lista ninguna aula) |
| CP-AUL-03 | OK | Guardado y /aulas lo muestra en el mismo orden (destacados: 5, nuevo primero; fotos: 3 → 2) |
| CP-AUL-04 | OK | «Cada foto necesita su texto alternativo (describí qué se ve).» |
| CP-AUL-05 | OK | Sin «Aulas» en el menú ni en «Nosotros»; /aulas: «Pronto vas a poder conocer nuestras aulas» |
| CP-AUL-06 | OK | Abre /galeria?categoria=aulas con «Aulas» seleccionada |
| CP-AUL-07 | OK | Chromium a 375 px: sin desborde, «Aulas» en el menú, la foto se amplía al tocarla |
