---
capacidad: INS
perfil: Retrofit
rutas: db/migrations, src/app/campus/admin/actions.ts
---
# Inscripciones y estados de cursada

La inscripción de un alumno a una edición respeta el cupo, nunca se borra y sus estados finales (desertor, finalizado) no se revierten. Semilla de retrofit: describe lo que ya hace la base (triggers); el detalle de negocio está en `docs/ESPECIFICACION-ACADEMIA.md` (RF-12, RF-14, RF-55).

## Requisitos

### REQ-INS-001 [must] Cupo exacto
El sistema DEBE rechazar una inscripción nueva cuando la edición ya tiene tantos inscriptos como su cupo.
- Escenario: Dado una edición con cupo 2 y dos inscriptos, Cuando se inscribe un tercer alumno, Entonces la base responde "cupos disponibles" y no crea la inscripción.
- verify: contract tests/db/reglas.sql
- confianza: confirmado

### REQ-INS-002 [must] El desertor sigue ocupando cupo
El sistema NO DEBE liberar el cupo de un alumno que pasó a desertor.
- Escenario: Dado una edición con cupo 2 y un inscripto desertor, Cuando se inscribe otro alumno, Entonces se rechaza por falta de cupo.
- verify: contract tests/db/reglas.sql
- confianza: confirmado

### REQ-INS-003 [must] N° de clase de la deserción
El sistema DEBE calcular en la base el N° de clase de la deserción como la cantidad de clases programadas con fecha menor o igual a la de deserción; las clases suspendidas, reprogramadas o salteadas NO DEBEN contar (RF-55).
- Escenario: Dado un alumno que desertó con 2 clases ya dictadas, Cuando se suspende una de ellas, Entonces `n_clase_desercion` pasa de 2 a 1.
- verify: contract tests/db/reglas.sql
- confianza: confirmado

### REQ-INS-004 [must] Desertor y finalizado son estados finales
El sistema NO DEBE permitir que un desertor vuelva a activo, ni que un finalizado pase a desertor o vuelva a activo; al finalizar DEBE anotar `finalizado_el` con el día de Argentina (RF-14, RF-55).
- Escenario: Dado una inscripción desertor o finalizada, Cuando se intenta cambiar su estado, Entonces la base responde "estado final".
- verify: contract tests/db/reglas.sql
- confianza: confirmado

### REQ-INS-005 [must] La inscripción nunca se borra
El sistema NO DEBE permitir el DELETE de una inscripción, en ningún rol.
- Escenario: Dado una inscripción existente, Cuando se ejecuta un DELETE, Entonces la base lo rechaza y la fila sigue ahí.
- verify: contract tests/db/reglas.sql
- confianza: confirmado

### REQ-INS-006 [should] Acceso al material 3 meses tras finalizar
El sistema DEBERÍA mantener el acceso del alumno finalizado al material de su curso hasta `finalizado_el` más 3 meses (`acceso_hasta`, migración 0018).
- Escenario: Dado un alumno finalizado hace 2 meses, Cuando abre su curso, Entonces ve el material liberado y puede bajar el ZIP; pasados los 3 meses ya no.
- verify: manual MANUAL-PRUEBAS.md#REQ-INS-006
- confianza: gap

<!-- Gap abierto: la spec del cliente (RF-14, 🟡) dice "al finalizar el curso el alumno queda sin curso asignado"; el código implementa los 3 meses de acceso. Confirmar con Mateo/cliente antes de tocar nada. -->
