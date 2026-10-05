# DOMAIN — Recovery Parts

Resumen del dominio. El esquema real está en `supabase/migrations/0001_schema.sql`; los requisitos, en la spec.

## Entidades
- `profiles`: rol (`admin` | `profesor` | `alumno`), estado de cuenta (`activa`…), mini-CV del profesor. Solo se crea si el usuario fue invitado.
- `aulas`, `cursos` (+ `horarios_curso`, `modulos_curso`, `clases`, `kit_items`).
- `inscripciones`: alumno ↔ curso, estado `activo` | `desertor` | `finalizado`. Nunca se borra.
- `materiales`: PDF o link, liberación manual o por fecha.
- `encuestas`, `encuesta_completadas` (quién respondió) y `encuesta_respuestas` (sin `alumno_id`).
- `contactos`: bandeja del formulario público.
- `site_settings` / `cms_*`: contenido del sitio.

## Reglas de negocio
| Regla | RF | Dónde se aplica |
|---|---|---|
| Desertor es final; motivo obligatorio; no se vuelve a activo | RF-55 | trigger |
| N° de clase de deserción = clases programadas con fecha ≤ la de deserción (las suspendidas no cuentan) | RF-55 | trigger |
| No superar el cupo ni bajarlo de los inscriptos | — | trigger |
| No superponer aula ni profesor en mismo día y horario | — | trigger |
| El alumno ve solo lo liberado y no si es desertor | — | `material_visible()` |
| El alumno ve solo el título de la próxima clase | — | `proxima_clase_titulo` |
| Un alumno con un solo curso activo entra directo a él (configurable en el CMS) | RF-11 | app |
| ZIP del curso solo para inscripciones `finalizado` y cursos no dados de baja | — | `/api/curso/[id]/zip` |
| Encuesta anónima | — | `responder_encuesta()` |
| El alumno puede descargar los PDFs (`?download=1`) | RF-33 | `/api/material/[id]` |

## Lenguaje de producto
Área pública: «Reparación y Tecnología». Hay *cursos de* reparación; no se ofrece servicio técnico.
