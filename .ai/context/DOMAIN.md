# DOMAIN — Recovery Parts

Resumen del dominio. El esquema real está en `db/migrations/0001_schema.sql`; los requisitos, en la spec.

## Entidades
- `profiles`: rol (`admin` | `profesor` | `alumno`), estado de cuenta (`activa`…), mini-CV del profesor. Solo se crea si el usuario fue invitado.
- `aulas` (nombre único sin distinguir mayúsculas, `capacidad`, `activa`; migración 0010).
- `cursos` = **catálogo** (contenido, precio, `kit_items` y la **estructura**: `modulos_curso` → `plan_clases` (título libre, `tipo` teórica/práctica, `modulo_id`, `numero` = posición) → `materiales` por `plan_clase_id`; migraciones 0012–0014, RF-58). Los talleres no tienen módulos. Desde la 0017 lo del curso es la **guía general** (filas con `edicion_id` null, solo la edita el admin); una edición puede tener su **estructura propia** (filas con `edicion_id` = la edición; cada clase copiada guarda `origen_id`). Una edición está «personalizada» si tiene clases propias (`edicion_personalizada`); si no, usa la guía.
- `ediciones` = cada vez que se dicta un curso (migración 0011): fecha de inicio, aula, profesor, cupo, `activo`; dependen de ella `horarios_curso`, `clases` (`plan_clase_id`, fecha, estado `programada` | `suspendida` | `reprogramada` | `salteada`), `inscripciones`, `encuestas` y `materiales_liberados` (liberación manual por edición).
- `inscripciones`: alumno ↔ curso, estado `activo` | `desertor` | `finalizado`. Nunca se borra. Al pasar a `finalizado` el trigger anota `finalizado_el` (día en Argentina) y la columna generada `acceso_hasta` = `finalizado_el` + 3 meses (migración 0018): hasta ese día el alumno sigue accediendo al material.
- `materiales`: PDF o link de una clase (o «general» sin clase). Liberación siempre manual por edición (RF-32). `edicion_id` null = **material base** (admin, sobre la guía; se ve en las ediciones que conservan esa clase); con `edicion_id` = material que el profesor subió para esa edición.
- `encuestas`, `encuesta_completadas` (quién respondió) y `encuesta_respuestas` (sin `alumno_id`).
- `contactos`: bandeja del formulario público.
- `site_settings` / `cms_*`: contenido del sitio.

## Reglas de negocio
| Regla | RF | Dónde se aplica |
|---|---|---|
| Desertor es final; motivo obligatorio; no se vuelve a activo | RF-55 | trigger |
| **Finalizado también es final**: no pasa a desertor ni vuelve a activo | RF-14 | trigger (0019) |
| Las clases suspendidas/reprogramadas quedan con `aviso_pendiente` hasta que el mail sale bien; el banner del calendario permite reenviar | RF-38 | `guardar_calendario` (0029), `enviarAvisosPendientes` |
| Una inscripción nueva no entra a una edición terminada ni a una cuenta inactiva | RF-12 | `agregarAlumno` |
| La encuesta no cambia de edición si ya tiene respuestas | RF-47 | `guardarEncuesta` |
| N° de clase de deserción = clases programadas con fecha ≤ la de deserción (las suspendidas, reprogramadas y salteadas no cuentan) | RF-55 | trigger |
| Cursos: toda clase en un módulo, ningún módulo vacío, clases de un módulo juntas; talleres sin módulos | RF-58 | constraint trigger `validar_estructura` |
| El material y el calendario siguen a la clase (por id); clase borrada → su material queda general; no se borra una clase con fechas | RF-58 | FK + `guardar_estructura` |
| Orden flexible por edición: adelantar (fecha antes que otras) o saltear una clase; no avisa por mail | RF-58 | `guardarClases` |
| Guía general (admin) + estructura propia por edición: copy-on-write al primer guardado; nueva edición = guía; «Volver a la guía general» devuelve calendario y material propio a la clase de origen (sin origen: se pierde la fecha / queda general) | RF-58 | `guardar_estructura` (solo admin), `guardar_estructura_edicion`, `restablecer_estructura`, `estructura_edicion` |
| Calendario, material y liberación usan la estructura efectiva de la edición | RF-58 | triggers `clases_before_write`, `materiales_integridad`, `materiales_liberados_integridad` |
| El profesor solo accede a ediciones vigentes (activas y cuyo fin no pasó; el fin es la última clase, o inicio + duración del curso si todavía no hay calendario); misma regla en `momentoEdicion()` (TS) y `fin_edicion()`/`edicion_vigente()` (SQL, 0020) | RF-04 | `es_profesor_de`, RLS `ediciones_profesor` |
| El profesor borra solo el material que subió para su edición; el base no. No lee el kit en el campus | RF-05 | RLS `mat_profesor_*`; sin `kit_profesor` |
| No superar el cupo ni bajarlo de los inscriptos | — | trigger |
| No superponer aula ni profesor en mismo día y horario | — | trigger |
| Cupo del curso ≤ capacidad del aula (al crear/editar el curso, cambiarle el aula o bajar la capacidad); capacidad obligatoria en aulas nuevas | RF-03 | trigger |
| Aulas: baja lógica, sin DELETE; no se da de baja con cursos activos; no se asigna un aula dada de baja | RF-03 | trigger |
| Una edición activa por vez por curso (períodos sin superponer); fecha de inicio obligatoria; clases dentro del plan y no anteriores al inicio | — | trigger |
| Choques de aula/profesor solo entre ediciones con períodos superpuestos | RF-17 | trigger |
| Material visible en una edición: solo si el profesor lo liberó en esa edición (la fecha de la clase no libera nada) | RF-32 | `material_visible(edicion)` |
| Un alumno puede cursar otra edición del mismo curso, no dos veces la misma | — | unique |
| El alumno ve solo lo liberado y no si es desertor | — | `material_visible()` |
| Tres preguntas sobre el alumno y una edición: no desertor (`alumno_activo_en`: encuestas, horarios) · con acceso al material (`alumno_con_acceso`: cursa o finalizó hace ≤ 3 meses) · cursando (`alumno_cursando`: próxima clase) | RF-34, RF-35 | 0018 |
| Encuesta pendiente = activa, de una edición donde no es desertor y sin responder; se anuncia en el curso, en «Encuestas» y en el contador del menú | RF-47 | `encuestasPendientes()` (`src/lib/encuestas.ts`) |
| Cambio de contraseña con sesión: pide la actual, mismo límite de intentos que el login, cierra las demás sesiones | RF-59 | `cambiarContrasena` (`src/app/auth/actions.ts`) |
| El alumno ve todos los módulos; de las clases, solo las dictadas, las que tienen material liberado y la próxima (título y tipo) | RF-37 | `temario_alumno`, `proxima_clase_titulo` |
| La ficha pública muestra solo los títulos de los módulos | RF-26 | vista `modulos_publicos` |
| Un alumno con un solo curso activo entra directo a él (configurable en el CMS) | RF-11 | app |
| ZIP del curso solo para inscripciones `finalizado` y cursos no dados de baja | — | `/api/curso/[id]/zip` |
| Encuesta anónima | — | `responder_encuesta()` |
| El alumno puede descargar los PDFs (`?download=1`) | RF-33 | `/api/material/[id]` |

## Lenguaje de producto
Área pública: «Reparación y Tecnología». Hay *cursos de* reparación; no se ofrece servicio técnico.

- `kit_items.requerido` (boolean, default true; migración 0009): ítem necesario para cursar (true) o recomendado (false). El link suele ir a Mundo Parts (tienda socia): solo se enlaza, la venta no pasa por el sistema (RF-45/46).
