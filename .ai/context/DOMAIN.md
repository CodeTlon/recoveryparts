# DOMAIN — Recovery Parts

Resumen del dominio. El esquema real está en `supabase/migrations/0001_schema.sql`; los requisitos, en la spec.

## Entidades
- `profiles`: rol (`admin` | `profesor` | `alumno`), estado de cuenta (`activa`…), mini-CV del profesor. Solo se crea si el usuario fue invitado.
- `aulas` (nombre único sin distinguir mayúsculas, `capacidad`, `activa`; migración 0010).
- `cursos` = **catálogo** (contenido, precio, `kit_items` y la **estructura**: `modulos_curso` → `plan_clases` (título libre, `tipo` teórica/práctica, `modulo_id`, `numero` = posición) → `materiales` por `plan_clase_id`; migraciones 0012–0014, RF-58). Los talleres no tienen módulos.
- `ediciones` = cada vez que se dicta un curso (migración 0011): fecha de inicio, aula, profesor, cupo, `activo`; dependen de ella `horarios_curso`, `clases` (`plan_clase_id`, fecha, estado `programada` | `suspendida` | `reprogramada` | `salteada`), `inscripciones`, `encuestas` y `materiales_liberados` (liberación manual por edición).
- `inscripciones`: alumno ↔ curso, estado `activo` | `desertor` | `finalizado`. Nunca se borra.
- `materiales`: PDF o link de una clase (o «general» sin clase). Liberación siempre manual por edición (RF-32).
- `encuestas`, `encuesta_completadas` (quién respondió) y `encuesta_respuestas` (sin `alumno_id`).
- `contactos`: bandeja del formulario público.
- `site_settings` / `cms_*`: contenido del sitio.

## Reglas de negocio
| Regla | RF | Dónde se aplica |
|---|---|---|
| Desertor es final; motivo obligatorio; no se vuelve a activo | RF-55 | trigger |
| N° de clase de deserción = clases programadas con fecha ≤ la de deserción (las suspendidas, reprogramadas y salteadas no cuentan) | RF-55 | trigger |
| Cursos: toda clase en un módulo, ningún módulo vacío, clases de un módulo juntas; talleres sin módulos | RF-58 | constraint trigger `validar_estructura` |
| El material y el calendario siguen a la clase (por id); clase borrada → su material queda general; no se borra una clase con fechas | RF-58 | FK + `guardar_estructura` |
| Orden flexible por edición: adelantar (fecha antes que otras) o saltear una clase; no avisa por mail | RF-58 | `guardarClases` |
| No superar el cupo ni bajarlo de los inscriptos | — | trigger |
| No superponer aula ni profesor en mismo día y horario | — | trigger |
| Cupo del curso ≤ capacidad del aula (al crear/editar el curso, cambiarle el aula o bajar la capacidad); capacidad obligatoria en aulas nuevas | RF-03 | trigger |
| Aulas: baja lógica, sin DELETE; no se da de baja con cursos activos; no se asigna un aula dada de baja | RF-03 | trigger |
| Una edición activa por vez por curso (períodos sin superponer); fecha de inicio obligatoria; clases dentro del plan y no anteriores al inicio | — | trigger |
| Choques de aula/profesor solo entre ediciones con períodos superpuestos | RF-17 | trigger |
| Material visible en una edición: solo si el profesor lo liberó en esa edición (la fecha de la clase no libera nada) | RF-32 | `material_visible(edicion)` |
| Un alumno puede cursar otra edición del mismo curso, no dos veces la misma | — | unique |
| El alumno ve solo lo liberado y no si es desertor | — | `material_visible()` |
| El alumno ve todos los módulos; de las clases, solo las dictadas, las que tienen material liberado y la próxima (título y tipo) | RF-37 | `temario_alumno`, `proxima_clase_titulo` |
| La ficha pública muestra solo los títulos de los módulos | RF-26 | vista `modulos_publicos` |
| Un alumno con un solo curso activo entra directo a él (configurable en el CMS) | RF-11 | app |
| ZIP del curso solo para inscripciones `finalizado` y cursos no dados de baja | — | `/api/curso/[id]/zip` |
| Encuesta anónima | — | `responder_encuesta()` |
| El alumno puede descargar los PDFs (`?download=1`) | RF-33 | `/api/material/[id]` |

## Lenguaje de producto
Área pública: «Reparación y Tecnología». Hay *cursos de* reparación; no se ofrece servicio técnico.

- `kit_items.requerido` (boolean, default true; migración 0009): ítem necesario para cursar (true) o recomendado (false). El link suele ir a Mundo Parts (tienda socia): solo se enlaza, la venta no pasa por el sistema (RF-45/46).
