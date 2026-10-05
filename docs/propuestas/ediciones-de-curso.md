# Propuesta: ediciones de curso (cursos recurrentes)

> Rama `feat/ediciones-cursos` · **no está mergeada a `dev`**. Este documento explica qué cambia y cómo probarlo para decidir si se incorpora.

## El problema

Un mismo curso se dicta varias veces al año (por ejemplo «Reparación de Celulares» en enero, mayo y agosto). Hoy, en el sistema, **un curso es una sola cursada**: tiene una fecha de inicio, un calendario con fechas y sus alumnos. Para dictarlo de nuevo hay dos caminos, y los dos están mal:

- **Crear otro curso igual:** hay que recargar a mano descripción, precio, temario, kit, plan de clases y material, y el sitio muestra el curso repetido.
- **Reactivar el mismo curso:** los cupos aparecen llenos (cuentan los alumnos de la vez anterior), un alumno no puede repetir (la base lo impide), el calendario y el material quedan con fechas viejas y los reportes mezclan las cursadas.

## La propuesta

Separar **lo que es del curso** (se carga una vez) de **cada vez que se dicta** (una *edición*):

| Curso (catálogo, una vez) | Edición (cada vez que se dicta) |
|---|---|
| Nombre, área, tipo, nivel, descripción, requisitos | Fecha de inicio y horarios |
| Imagen, video, **precio** y descuento | Aula, profesor y cupo |
| Plan de estudios público y kit | **Calendario** (fecha y estado de cada clase) |
| **Plan de clases** (N° y título de cada clase) | Alumnos y sus estados |
| **Material** (asociado a un N° de clase) | Liberación del material y encuesta |

### Reglas acordadas

- **Una edición activa por vez** por curso: sus períodos no se pueden superponer.
- **Un solo precio** por curso (si sube, sube para todas las ediciones).
- **Los títulos de las clases son los mismos** en todas las ediciones; cada edición pone sus fechas.
- **El material vive en el curso, asociado al N° de clase.** Cada edición lo libera sola cuando llega la fecha de esa clase en *su* calendario; el profesor puede adelantarlo solo en su edición. El material «general» (sin clase) se libera a mano en cada edición.
- **Al crear o duplicar una edición hay que asignar de nuevo las fechas de las clases** (el sistema las propone desde la fecha de inicio y los horarios).
- **Encuesta por edición** (los reportes se profundizan en una mejora siguiente).
- **Curso sin ediciones próximas:** en el sitio se muestra igual, con «Próximamente nuevas fechas» y el botón de WhatsApp.
- **Material y plan de clases los puede editar cualquier profesor que dicte una edición activa del curso** (como hoy, RF-31). El cambio afecta a todas las ediciones.
- Todo lo que hoy es del curso pasa a ser **de la edición**: cupo (1–500), cupo ≤ capacidad del aula, un único profesor, choques de aula/profesor, Desertor como estado final, inscripción que nunca se borra, N° de clase de deserción.

## Cómo queda el flujo del admin

1. **Crear el curso** (Campus › Cursos y talleres › Crear curso): solo el contenido y el precio. Al guardar, lleva al **Plan de clases**.
2. **Plan de clases:** se cargan los títulos (clase 1, 2, 3…).
3. **Nueva edición** (pestaña Ediciones): fecha de inicio, aula (muestra la capacidad y sugiere el cupo), profesor y cupo. Al crearla, lleva a **Horarios**.
4. **Horarios** de la edición (por ejemplo, martes de 18 a 20).
5. **Calendario:** «Proponer fechas» asigna una fecha a cada clase del plan en los días de cursada; se ajusta y se guarda.
6. **Alumnos:** se agregan a la edición (existentes o nuevos por invitación).
7. **La próxima vez: «Duplicar»** en la edición anterior. Pide solo la nueva fecha de inicio; copia horarios, aula, profesor y cupo, sin alumnos ni fechas, y lleva directo al Calendario para asignarlas.

## Qué ve cada perfil

- **Admin:** el curso con pestañas de contenido (Datos, Plan de estudios, Kit, Plan de clases, Material) y **Ediciones** (crear, duplicar, dar de baja, reactivar). Cada edición tiene su página (Datos, Horarios, Calendario, Alumnos). El Resumen y los reportes muestran cada edición como «Curso · mes año».
- **Profesor:** «Mis ediciones» (una tarjeta por cada vez que dicta un curso). En cada edición: alumnos, material del curso con su estado *en esa edición* («Se libera el 2/11», «Liberado en esta edición»…), calendario y plan de clases.
- **Alumno:** una tarjeta por edición («Celulares · nov 2026») con su propio estado. Puede haber desertado de una edición y cursar otra del mismo curso. Ve solo el material liberado en *su* edición.
- **Sitio público:** cada curso aparece **una vez**, con su próxima fecha («Inicia el 2 de noviembre · +1 fecha más»). La ficha tiene un recuadro **«Próximas fechas»** con cada edición abierta (inicio, horario, aula, cupos).

## Qué cambia en la base (migración `0011_ediciones.sql`)

- Tablas nuevas: `ediciones`, `plan_clases` y `materiales_liberados` (liberación manual por edición), todas con RLS.
- `inscripciones`, `clases`, `horarios_curso` y `encuestas` pasan de `curso_id` a `edicion_id`. `materiales` pasa de `clase_id` a `clase_numero`.
- `cursos` pierde fecha de inicio, aula, profesor y cupo (pasan a la edición).
- **Migración sin pérdida de datos:** cada curso existente se convierte en un curso con **una edición con el mismo id**. Se verificó con los datos de la demo: después de migrar, cada alumno ve exactamente el mismo material, estado y próxima clase que antes.
- Reglas nuevas en la base (no solo en la app): una edición por vez, fecha de inicio obligatoria, ninguna clase anterior al inicio de su edición, cada clase dentro del plan, choques de aula/profesor solo entre períodos que se superponen (si no, duplicar una edición chocaría consigo misma), y reactivar un curso revalida sus ediciones.
- Vistas públicas: `cursos_publicos` (un curso con su próxima edición) y `ediciones_publicas` (ediciones que todavía no empezaron).

## Cómo probarlo

```bash
git checkout feat/ediciones-cursos
npm install
npm run db:start
npm run db:reset          # aplica 0001–0011
npm run seed:dev          # en Windows: ver la nota en .ai/context/KNOWN_ISSUES.md
npm run dev
```

Las cuentas de demo son las del seed (`scripts/seed-pruebas.mjs`). Casos preparados:

- **Reparación de Celulares** tiene **dos ediciones** (septiembre, en curso, y noviembre).
- **Mariana** (alumno2) **desertó de la de septiembre y retoma en la de noviembre**: en su campus ve las dos, con estados distintos.
- **Pablo** (profe1) dicta las dos ediciones de Celulares: el material se libera distinto en cada una.
- En el sitio, «Reparación de Celulares» aparece una vez con sus próximas fechas; «Reparación de Notebooks» (ya empezada, sin otra edición) muestra «Próximamente nuevas fechas».

Para ver la duplicación: Campus › Cursos y talleres › Reparación de Celulares › Ediciones › **Duplicar** en la de noviembre, con fecha posterior al 7/12.

## Para tener en cuenta

- **Es un cambio grande:** toca la base, los permisos y las pantallas de los cuatro perfiles. Por eso está aislado en esta rama.
- **Homologación:** al mergear a `test`, la 0011 transforma los datos existentes con el mismo mecanismo probado sobre la demo.
- **Encuestas y reportes:** quedan adaptados por edición. Se acordó profundizar los reportes (por curso y por edición) en una mejora siguiente.
- Arregla de paso un bug de la ficha pública: el kit no distinguía ítems «necesarios» de «recomendados».
