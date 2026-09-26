# Manual de pruebas — Recovery Parts

Checklist de testing manual para flujos con riesgo real de bug que los tests automáticos no atrapan
(criterio humano de UI, timing/concurrencia, credenciales externas, auth). Se completa a medida que
se construyen o tocan esas features.

## Login / Invitaciones / Recuperar contraseña
- [ ] Admin invita a un alumno desde `/admin/usuarios` (nombre + email + rol) → llega el mail de invitación
- [ ] Al abrir el link de invitación en `/activar`, pedir contraseña y, tras guardarla, aterrizar en `/alumno`
- [ ] Repetir invitación con rol "Profesor" → tras activar, aterriza en `/profesor`
- [ ] Login con email/contraseña correctos → aterriza en el home del rol correspondiente
- [ ] Login con contraseña incorrecta → mensaje de error genérico, sin distinguir "no existe" de "contraseña mal"
- [ ] 10 intentos de login fallidos seguidos desde la misma red → bloquea con "Demasiados intentos" (rate limit)
- [ ] `/recuperar` con un email real → llega el mail; con un email que no existe → mismo mensaje genérico (sin filtrar si existe la cuenta)
- [ ] Completar `/recuperar/nueva-clave` desde el link del mail → redirige a `/login?actualizado=1` (mensaje de éxito) y la contraseña vieja deja de funcionar
- [ ] Si había otra pestaña/dispositivo con sesión abierta, tras cambiar la contraseña esa sesión también queda cerrada (revisar al recargar)
- [ ] Entrar a `/admin`, `/alumno` o `/profesor` sin sesión → redirige a `/login?next=...`
- [ ] Loguearse como alumno e intentar entrar a `/admin` manualmente por URL → redirige a `/alumno` (no accede)
- [ ] Cerrar sesión desde el botón del sidebar → vuelve a pedir login al reintentar entrar al campus
- [ ] Admin desactiva una cuenta desde `/admin/usuarios` → ese usuario ya no puede loguearse (mensaje "cuenta desactivada") · reactivarla lo vuelve a permitir

## Cursos, matrícula y calendario
- [ ] Crear un curso en `/admin/cursos/nuevo` con días/horario/aula → se genera el calendario completo de clases (revisar en `/profesor/cursos/[id]`)
- [ ] Crear un segundo curso con el mismo aula y horario superpuesto → bloquea con el mensaje de conflicto (RF-17)
- [ ] Asignar el mismo profesor a dos cursos con horario superpuesto → bloquea (RF-18)
- [ ] Agregar un alumno nuevo (email que no existe) a un curso → recibe invitación; agregar un alumno que YA tiene cuenta de otro curso → se vincula directo, sin invitación nueva (RF-13)
- [ ] Llenar el cupo del curso e intentar agregar un alumno más → bloquea "No quedan cupos"
- [ ] Profesor marca a un alumno como "Desertor" con motivo y fecha → guarda `n_clase_desercion` coherente con el calendario
- [ ] Suspender o reprogramar una clase y volver a marcar una deserción posterior → esa clase no suma al conteo (RF-38)
- [ ] Admin reactiva una matrícula desertora → vuelve a "Activo" y limpia motivo/fecha de baja
- [ ] Alumno con un solo curso activo entra a `/alumno` → aterriza directo en el curso, sin listado intermedio (RF-11)
- [ ] Alumno con 2+ cursos activos entra a `/alumno` → ve el listado y puede navegar a cada uno

## Material de estudio
- [ ] Profesor sube un material con "Liberar ahora" tildado → aparece inmediato en `/alumno/cursos/[id]`
- [ ] Profesor sube un material sin liberar → el alumno NO lo ve hasta que el profesor toque el rayo ("Liberar ahora")
- [ ] Alumno ve el título de la próxima clase pero no el temario de clases futuras (RF-37)
- [ ] Marcar a un alumno como "Inactivo"/"Desertor" → deja de ver el material del curso (RLS exige `matriculas.estado = 'activo'`)

## Kit, encuesta y reportes
- [ ] Cargar 2-3 ítems de kit en `/admin/cursos/[id]`, guardar y volver a entrar → persisten (probar también borrar uno)
- [ ] Admin crea una pregunta de encuesta (rating y texto) para un curso
- [ ] Marcar la matrícula de un alumno como "Finalizado" → le aparece la encuesta en `/alumno/cursos/[id]`
- [ ] Responder la encuesta → no puede volver a responder (ni reenviando el form a mano)
- [ ] Los resultados en `/admin/cursos/[id]` muestran el promedio (rating) o el listado de respuestas (texto), sin mostrar de quién es cada una
- [ ] `/admin/reportes` refleja los números de al menos 2 cursos con estados variados (activo/finalizado/desertor)

## Sitio público y CMS
- [ ] Editar el Hero desde `/admin/sitio` → se refleja en la Home sin redeploy
- [ ] Marcar un curso como "Destacado" → aparece en "Capacitaciones Destacadas" de la Home; sacarlo → desaparece
- [ ] Cargar una foto en `/admin/galeria` en cada categoría → aparece agrupada en `/galeria`, el lightbox navega con las flechas
- [ ] Cargar un testimonio y un ítem de FAQ → aparecen en la Home; ocultarlos (botón "Publicado"/"Oculto") → desaparecen sin borrarlos
- [ ] Buscar/filtrar en `/cursos` por texto, área y tipo → la lista se combina correctamente; buscar algo que no existe → mensaje "No encontramos cursos" + link de WhatsApp
- [ ] Entrar a `/cursos/[slug]` de un curso con kit cargado → aparece el bloque "Kit necesario" con los links de compra; un curso sin kit no muestra el bloque
- [ ] Enviar el formulario de contacto de la Home → llega el mail a `COMPANY_EMAIL` y la consulta aparece en `/admin/contactos`
- [ ] Reenviar el formulario de contacto más de 5 veces seguidas → bloquea con el mensaje de rate limit
- [ ] `/sitemap.xml` incluye los cursos publicados; `/robots.txt` bloquea `/admin`, `/alumno`, `/profesor`, `/login`
