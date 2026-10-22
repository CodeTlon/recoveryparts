---
capacidad: CAL
perfil: Retrofit
rutas: db/migrations, src/app/campus/admin/cursos
---
# Calendario de clases y avisos

El calendario de una edición se guarda de forma atómica, detecta ediciones simultáneas y deja registrado qué cambios todavía no se avisaron por mail. Semilla de retrofit: describe `guardar_calendario` y los horarios (RF-38, RF-58).

## Requisitos

### REQ-CAL-001 [must] Guardado atómico
El sistema DEBE reemplazar el calendario de una edición en una única operación (`guardar_calendario`) y devolver las clases previas.
- Escenario: Dado una edición con 3 clases, Cuando se guarda un calendario de 1 clase, Entonces la función devuelve las 3 previas y la edición queda con exactamente 1.
- verify: contract tests/db/reglas.sql
- confianza: confirmado

### REQ-CAL-002 [must] Calendario desactualizado
El sistema NO DEBE guardar un calendario con una versión vieja: si el calendario cambió mientras se editaba, DEBE responder "cambió mientras lo editabas". Un cliente sin versión PUEDE guardar igual.
- Escenario: Dado un editor con la versión `v`, Cuando otro cambio modifica las clases y se guarda con `v`, Entonces se rechaza sin pisar el cambio.
- verify: contract tests/db/reglas.sql
- confianza: confirmado

### REQ-CAL-003 [must] Horarios sin superposición
El sistema NO DEBE aceptar dos horarios de la misma edición que se pisen el mismo día; los contiguos (20:00 y 20:00) DEBEN aceptarse.
- Escenario: Dado un horario lunes 18:00-20:00, Cuando se agrega lunes 19:00-21:00, Entonces se rechaza con "horarios superpuestos"; lunes 20:00-21:00 se acepta.
- verify: contract tests/db/reglas.sql
- confianza: confirmado

### REQ-CAL-004 [must] Aviso pendiente (RF-38)
El sistema DEBE marcar `aviso_pendiente` en una clase al suspenderla o reprogramarla, conservar la marca si se guarda sin cambios, NO DEBE volver a marcar un aviso ya enviado, y DEBE limpiarla al volver a `programada`.
- Escenario: Dado una clase suspendida con aviso enviado, Cuando se guarda el mismo calendario, Entonces no se marca de nuevo; si se reprograma la fecha, vuelve a quedar pendiente.
- verify: contract tests/db/reglas.sql
- confianza: confirmado

### REQ-CAL-005 [must] Guardar sin avisar y reenviar
El sistema DEBE permitir guardar un cambio de clase sin enviar el mail, dejar la clase con aviso pendiente y ofrecer en el calendario un banner con el botón "Enviar avisos pendientes".
- Escenario: Dado el admin en la pestaña calendario, Cuando suspende una clase y desmarca "Avisar ahora por mail", Entonces la clase queda con `aviso_pendiente` y el banner "sin avisar a los alumnos" muestra el botón de reenvío.
- verify: e2e tests/e2e/campus.spec.ts
- confianza: confirmado
