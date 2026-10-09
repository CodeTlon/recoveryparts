# Registro de decisiones

Una línea por decisión: qué, por qué. Las más nuevas arriba.

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-06 | **Estructura del curso** (RF-58): módulos → clases (título libre, teórica o práctica) → material. En cursos no hay clases sin módulo ni módulos sin clases y las clases de un módulo van juntas; los talleres no llevan módulos. Lo editan admin y profesor | Módulos, plan de clases y material estaban sueltos: el temario se escribía dos veces y el material se ataba a un número |
| 2026-10-06 | El material y el calendario apuntan a la clase por id (no por su N°); si se borra una clase, su material queda «general» | Reordenar el plan cambiaba el material de clase sin aviso |
| 2026-10-06 | Orden flexible por edición: el profesor puede adelantar o saltear una clase (estado `salteada`); no avisa por mail | El profesor ajusta el ritmo del grupo; el aviso se da en clase para que el alumno no lo use para decidir si falta |
| 2026-10-06 | **RF-32 cambia: liberación del material siempre manual** (antes, automática por fecha + manual) | Con el orden flexible, la fecha deja de decir qué se dio; la responsabilidad es del profesor |
| 2026-10-06 | Sitio público: solo títulos de módulos (sin clases ni viñetas). Alumno: todos los módulos, pero no las clases de los que no empezaron; de la próxima, título y tipo | Que nadie conozca el temario completo para adelantarse (RF-26, RF-37) |
| 2026-10-06 | Los cursos ya cargados en homologación se recargan a mano con la estructura nueva | No hay datos reales; convertirlos automáticamente no vale la pena |
| 2026-10-06 | Migraciones 0009–0011 aplicadas a mano en el SQL Editor de homologación: 0009+0010 antes del deploy y 0011 justo después del deploy del PR #7 | Falta el secreto del workflow y homologación es la base de la demo del cliente: la 0011 rompe el código viejo, así que tenía que llegar junto con el código nuevo |
| 2026-10-05 | **Ediciones de curso** (rama `feat/ediciones-cursos`, en revisión): `cursos` = catálogo y `ediciones` = cada dictado; cada curso existente migra a una edición con el mismo id | Los cursos se dictan varias veces al año; reactivar o recrear cursos mezclaba alumnos, cupos, fechas y reportes |
| 2026-10-05 | Una edición activa por vez por curso; un solo precio por curso; títulos de clase en el curso y fechas en cada edición; encuesta por edición | Decisiones del producto para la primera versión; reportes por curso/edición se profundizan después |
| 2026-10-05 | Material del curso por N° de clase, liberado según el calendario de cada edición o a mano por edición; al crear/duplicar una edición se asignan fechas de nuevo | Se carga una vez y cada grupo respeta su ritmo |
| 2026-10-05 | Material y plan de clases los edita cualquier profesor con una edición activa del curso | Respeta RF-31 (el profesor carga el temario); el cambio afecta a todas las ediciones |
| 2026-10-05 | Choques de aula/profesor solo entre ediciones con períodos superpuestos | Sin esto, duplicar una edición (misma aula/horario en otro período) chocaba consigo misma |
| 2026-10-05 | «Próximas fechas» públicas = ediciones que empiezan hoy o después | A una edición en curso no se puede anotar nadie; sin otra, el curso muestra «Próximamente nuevas fechas» |
| 2026-10-05 | RF-03 🟢: aulas como catálogo propio (Campus › Aulas); cupo y precio siguen en el curso; insumos = solo kit informativo | Lo propio de cada curso se edita en el curso y lo compartido tiene su módulo, igual que profesores en Usuarios |
| 2026-10-05 | El cupo del curso nunca supera la capacidad del aula, controlado en la base (no solo aviso) | La capacidad es física (bancos/puestos); el cupo es el límite elegido por curso (equipamiento, atención del profesor, tipo de actividad) |
| 2026-10-05 | Capacidad obligatoria en aulas nuevas; las existentes sin capacidad no se validan hasta cargarla. Una sola capacidad por aula | Homologación/producción tienen aulas sin capacidad: no invalidar cursos existentes. Si una actividad admite menos personas, lo refleja el cupo del curso |
| 2026-10-05 | Aulas con baja lógica y sin borrado (también para aulas nunca usadas) | Conservar el dato histórico de los cursos; más simple y sin riesgo |
| 2026-10-05 | Reportes se fusiona con el Resumen del admin; el sitio web se edita por pestañas | El resumen era solo 4 tarjetas y la edición del sitio era una página larga sin contexto de qué se editaba |
| 2026-10-05 | Kit por ítem «necesario»/«recomendado» (`kit_items.requerido`, migración 0009) con link de compra a Mundo Parts | Algunos materiales hacen falta para cursar y otros son sugeridos; la tienda socia solo se enlaza (la venta no pasa por el sistema, RF-45/46) |
| 2026-10-05 | Contacto y Preguntas frecuentes con página propia; la home queda como resumen | Pedido del cliente: ordenar el sitio. La home muestra 4 FAQ y una banda hacia `/contacto` |
| 2026-10-05 | Encabezados de seguridad en el middleware y server actions con nombre ASCII | Vercel rechazaba el deploy («Builder returned invalid routes»): la `ñ` de `añadirAlumno` iba al encabezado `x-server-action-name` |
| 2026-10-05 | El PDF de avance no lleva capturas ni precios: una sección por página, con credenciales | Pedido del cliente; es un informe de demo, no una propuesta |
| 2026-10-05 | `dev` manda sobre `feat/unificacion`; la base de homologación se recreó desde las migraciones de `dev` | `feat/unificacion` es un linaje viejo con otro esquema; unificar era reescribir, no mergear. La base de test es de pruebas, así que se vació y se re-aplicó |
| 2026-10-05 | Cuentas de demo fijas: `@demo.example.com` / `demo1234` (solo seeds, que se niegan a correr fuera de development/test) | Fáciles de dictar al cliente; admin = Maxi Gómez |
| 2026-10-05 | Talleres de formato corto (1 jornada, 3 días seguidos, 1–2 semanas) además de cursos | Pedido del cliente; el tipo `taller` ya existía, no hay límite de clases en la base |
| 2026-10-05 | Formularios del curso por filas (no textarea con `\|`) y gráficos SVG propios | Más intuitivo; las server actions siguen recibiendo el mismo texto. Sin librerías de gráficos |
| 2026-10-05 | Sin `alert`/`confirm` del navegador: `ModalButton` y `Confirm` con modal propio | Pedido del cliente; consistencia visual y accesibilidad |
| 2026-10-01 | Tres entornos: desarrollo (Supabase local) → homologación (`test`, Supabase remoto actual) → producción (`main`); ramas `feature/* → dev → test` por merge y `test → main` por PR | Pedido del cliente; homologación es espejo de producción |
| 2026-10-01 | Hosting en GitHub + Vercel; CI en GitHub Actions; migraciones automáticas al mergear a `test`/`main` | Despliegue directo con Next.js y un entorno por rama |
| 2026-10-01 | Registro público desactivado también en `supabase/config.toml` (local) y por migración en la base | Defensa en profundidad; en los proyectos remotos se desactiva en el panel de Auth |
| 2026-10-01 | Proyecto local con `project_id = recoveryparts-dev` | Existía un volumen Docker viejo `recoveryparts` con otro esquema y datos; no se tocó |
| 2026-10-01 | `seed-homologacion.mjs` pasa a `seed-pruebas.mjs` con `ENV_FILE` y se niega a correr si `APP_ENV` no es development/test | Poder sembrar desarrollo y homologación sin riesgo de tocar producción |
| 2026-10-01 | Perfil y rol solo si el usuario fue **invitado** (`invited_at`); migración 0006 reemplaza a la 0005 | El registro público estaba habilitado en Auth y permitía autoasignarse `rol=admin`. La 0005 rechazaba en el INSERT y bloqueaba también las invitaciones legítimas (GoTrue marca `invited_at` después de crear el usuario) |
| 2026-10-01 | Fijar `supabase-js 2.100.0` y `ssr 0.9.0` | Las versiones recientes exigen Node 22; el entorno usa Node 20 |
| 2026-10-01 | Cuentas de prueba en `@homologacion.example.com` | Supabase rechaza el dominio `.test`; `example.com` no recibe mails |
| 2026-10-01 | El alumno **puede descargar** los PDFs (además de la vista previa) | Pedido del cliente; cambia RF-33 (spec v0.6). El acceso sigue validado en el servidor |
| 2026-10-01 | **Sin botón flotante de WhatsApp** (RF-41 cancelado) | No se sabe nada de WhatsApp ni de un bot por ahora. Se mantienen los enlaces «Consultar por WhatsApp» |
| 2026-10-01 | Avisos automáticos **por mail** (RF-38) | Sin canal WhatsApp definido |
| 2026-10-01 | Entrada directa del alumno con un solo curso activo (RF-11) | Confirmado por el cliente; configurable desde el CMS |
| 2026-10-01 | Área pública «**Reparación y Tecnología**» | La academia no presta servicio técnico; la etiqueta «Servicio Técnico» sugería que sí |
| 2026-10-01 | Sin datos mockeados; backend real con Supabase | Pedido del cliente |
| 2026-10-01 | Sin asistencia, pagos, inscripciones ni stock | Los maneja software externo (spec §C) |
| 2026-10-04 | El ZIP del curso (RF-35) incluye **solo los PDFs ya liberados** (manual o fecha cumplida), igual que `material_visible`; si falla la descarga de un archivo responde 502 en vez de entregar un ZIP incompleto | El ZIP usa service role y traía también el material oculto o programado, que el alumno no podía ver | 
| 2026-10-04 | El desertor **sigue ocupando cupo** (la inscripción nunca se borra y cuenta para el cupo). Decidido por el cliente; no filtrar por estado en el trigger de cupo, `cupos_disponibles` ni los reportes | Respuesta a la duda de la auditoría (cupo vs. desertor) | 
| 2026-10-04 | Auditoría fase 3 (UI): `components/campus/ui.tsx` pasa a server y lo interactivo vive en `forms.tsx` (`'use client'`, re-exportado desde ui.tsx); `Field` usa `useId()`; texto sobre naranja en `text-surface` (contraste AA); `color-scheme: dark`; `loading/error/global-error/campus/not-found`, favicon, robots, sitemap, skip-link; `getSettings/getCursos/getHorarios` con `cache()` | IDs duplicados rompían las etiquetas; blanco sobre naranja daba 2,8:1 | 
| 2026-10-04 | Auditoría fase 2: «hoy» siempre en hora de Córdoba (`hoy_ar()` en SQL, `hoyAR()` en `src/lib/fechas.ts`); encuestas exigen curso y validan puntaje 1–5; el N° de clase del desertor se recalcula al cambiar el calendario; el cupo se serializa con lock; horarios/temario/kit se reemplazan en una transacción (`reemplazar_filas_curso`); `guardarClases` no borra clases con material ni acepta estados inválidos | El servidor está en UTC (desde las 21:00 «hoy» era mañana); varias acciones borraban y reinsertaban sin transacción | 
| 2026-10-04 | Auditoría de seguridad, fase 1: migración 0007 (URL http(s) y `storage_path` del propio curso en `materiales`, trigger de integridad, `audit_log` solo firmable por uno mismo, largos en formularios públicos, RPC sin `anon`); `src/lib/validar.ts` para validar URLs/imágenes; CSP + HSTS + Permissions-Policy; baja de cuenta con `ban_duration` | Un profesor/admin podía saltarse las validaciones de las server actions escribiendo por PostgREST (XSS con `javascript:`, lectura de PDFs de otro curso). `signOut(id)` no revocaba nada: espera un JWT |
| 2026-10-01 | Un solo sistema de diseño (tokens en Tailwind, azul/naranja) | Convivían dos (tokens `demo-*` y paleta Stitch) |

## Fotos y videos del CMS: compresión en el navegador (2026-10-09)
- Vercel limita el cuerpo de un request a 4,5 MB → no se pasan archivos por server actions. `MediaField` (`src/components/campus/MediaField.tsx`) comprime en el cliente (`src/lib/media.ts`: foto → WebP ≤1920 px q82; video → ≤720p ~1 Mbps, máx. 60 s, ≈3-4 MB por 30 s) y sube directo a `sitio` con URL firmada (`firmarSubidaMedia`, solo admin).
- Bucket `sitio` acepta además `video/mp4` y `video/webm`, tope 25 MB (migración 0015). CSP: se agregó `media-src` (`blob:` para comprimir, `https:` para reproducir).
- Videos: `cursos.video_url` (si es .mp4/.webm se reproduce con `<video controls>`, si es un link sigue como "Ver video") y `hero.video_url` (fondo de la portada, muted + loop).
- Limitación: la compresión re-codifica en tiempo real (tarda lo que dura el clip) y depende de MediaRecorder; HEVC 4K puede no decodificarse en Chrome de Linux/Windows.
