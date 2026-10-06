# Arquitectura

## Capas
```
Navegador
  └─ Next.js 15 (App Router)
       ├─ Server Components: leen datos con la sesión del usuario (RLS aplica)
       ├─ Server Actions / Route Handlers: escrituras y archivos; validan rol con requireRole()
       └─ middleware.ts: refresca sesión; en /campus/* exige sesión, cuenta activa y rol
            └─ Supabase
                 ├─ Auth (invitación, reset, sesiones en cookies httpOnly)
                 ├─ Postgres: tablas + RLS + triggers + funciones SQL
                 └─ Storage: `materiales` (privado, PDFs) · `sitio` (público, imágenes del CMS)
```
El cliente `service_role` (`lib/supabase/admin.ts`) se usa solo en el servidor, y siempre después de validar el rol: invitar usuarios, cambiar email, cerrar sesiones, servir PDFs y armar el ZIP.

## Autorización en tres capas
1. **Middleware**: sin sesión → `/login`; cuenta no activa → fuera; cada rol solo entra a su `/campus/<rol>`.
2. **`requireRole(...roles)`** al inicio de cada página/acción del campus.
3. **RLS** en todas las tablas (la defensa real). Helpers SQL: `es_admin()`, `es_profesor_de(curso)`, `alumno_activo_en(curso)`, todos `security definer`.

| Dato | Admin | Profesor | Alumno | Anónimo |
|---|---|---|---|---|
| Cursos (todos / sus cursos / activos) | CRUD | solo los suyos | solo en los que no es desertor | vista `cursos_publicos` |
| Alumnos | todos | solo de sus cursos | solo él | — |
| Material | CRUD | CRUD en sus cursos | vía `material_visible()` (liberado y no desertor) | — |
| Respuestas de encuesta | lectura | — | solo vía `responder_encuesta()` | — |
| CMS / ajustes | CRUD | lectura | lectura | lectura |

## Modelo de datos (resumen)
`profiles` (rol, estado de cuenta, mini-CV del profesor) · `aulas` (capacidad, activa) · `ediciones` (cada dictado: fecha, aula, profesor, cupo; de ella cuelgan horarios, clases, inscripciones, encuestas y `materiales_liberados`) · `plan_clases` · `cursos` (+ `horarios_curso`, `modulos_curso`, `clases`, `kit_items`) · `inscripciones` (alumno↔curso, estado activo/desertor/finalizado) · `materiales` (PDF o link) · `encuestas` + `encuesta_completadas` + `encuesta_respuestas` · `contactos` · `demanda_cursos` · `site_settings` + `cms_*` · `audit_log`.
Vistas públicas con solo columnas seguras: `cursos_publicos` (incluye `cupos_disponibles` en tiempo real), `horarios_publicos`, `modulos_publicos`, `kit_publico`.

## Flujos clave
- **Alta de usuario**: el admin invita (`inviteUserByEmail`, con `rol/nombre/apellido` en metadatos). Un trigger crea el perfil **solo** si hay `invited_at`. El usuario abre el mail → `/auth/confirm` valida el token → `/activar` define su contraseña → cuenta `activa`. Un signUp público no genera perfil ni acceso.
- **Alumno ya existente**: se vincula al curso y se le avisa por mail (sin token).
- **Material visible**: `material_visible(edicion)` devuelve solo lo que el profesor liberó a mano en esa edición (`materiales_liberados`; RF-32, siempre manual desde 0014) y solo si el alumno no es desertor. Para un PDF, `/api/material/[id]` revalida y sirve el archivo (`?download=1` para descarga). El alumno ve solo el *título y tipo* de la próxima clase (`proxima_clase_titulo`, por fecha) y su temario (`temario_alumno`: todos los módulos, y solo las clases dictadas, con material liberado o la próxima); no puede leer `clases`, `plan_clases` ni `modulos_curso`.
- **Deserción**: el admin marca Desertor con fecha y motivo. El trigger calcula `n_clase_desercion` (clases programadas con fecha ≤ la de deserción; las suspendidas, reprogramadas y salteadas no cuentan), impide volver a activo y la inscripción no se puede borrar.
- **Cupo y choques**: triggers rechazan superar el cupo, bajar el cupo por debajo de los inscriptos, superponer aula o profesor en un mismo día y horario, y que el cupo supere la capacidad del aula (al guardar el curso, cambiarle el aula o bajar la capacidad).
- **Ediciones** (0011): el curso es el catálogo; cada dictado es una edición. Una activa por vez por curso; choques de aula/profesor solo entre períodos superpuestos; duplicar copia horarios/aula/profesor/cupo sin fechas ni alumnos. El material se libera a mano por edición (`materiales_liberados`).
- **Estructura del curso** (0012–0014, RF-58): `modulos_curso` → `plan_clases` (`modulo_id`, `tipo` teórica/práctica, `numero` = posición) → `materiales.plan_clase_id`. El calendario (`clases.plan_clase_id`) y el material apuntan a la clase por id, así la siguen si cambia de lugar. Un constraint trigger diferido (`validar_estructura`) exige en cursos que toda clase tenga módulo, que no haya módulos vacíos y que las clases de un módulo vayan juntas; en talleres, sin módulos. Se guarda todo de una vez con `guardar_estructura` (admin o profesor del curso; upsert por id). La vista pública `modulos_publicos` expone solo los títulos de los módulos de cursos.
- **Aulas** (RF-03): catálogo en Campus › Aulas. Capacidad obligatoria en aulas nuevas, baja lógica (`activa`), sin DELETE y sin baja con cursos activos; un aula dada de baja no se puede asignar.
- **Encuesta anónima**: `responder_encuesta()` guarda que el alumno respondió (para no repetir) y la respuesta en otra tabla sin su id.
- **ZIP**: `/api/curso/[id]/zip` solo para inscripciones `finalizado` y cursos no dados de baja.
- **Contacto**: el formulario guarda en `contactos` (bandeja del admin). El mail de aviso requiere un webhook/SMTP (ver SETUP).

## Entornos
Desarrollo (Supabase local en Docker), homologación (`test`) y producción (`main`). Ver `docs/ENTORNOS.md`.

## Qué no existe a propósito
Pagos, inscripciones, asistencia, stock, registro público, WhatsApp flotante/bot, videos alojados (solo links), modalidad virtual, carreras.

## Pendientes operativos
SMTP propio y plantillas de mail de Auth (invitación y reset apuntando a `/auth/confirm`), desactivar el registro público en el panel de Auth, rotar las claves y la contraseña de base compartidas por chat, imágenes finales sin texto superpuesto y con consentimiento, y pasar de homologación a producción.
