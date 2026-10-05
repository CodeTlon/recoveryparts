# OPEN_QUESTIONS — Recovery Parts

Preguntas sin resolver. Marcá **UNKNOWN** lo que no se pudo confirmar, y no lo asumas. Cuando se resuelva: pasalo a `DECISIONS.md` y borralo de acá.

- **RF-03** — ¿Cómo gestiona el admin aulas, cupos, insumos y precios por curso? (🟡 en la spec)
- **RF-12 / RF-13** — ¿Cómo se crea un alumno con curso asignado y cómo se vincula uno existente a otro curso? (🟡)
- **RF-14** — Al finalizar el curso, ¿el alumno queda sin curso de forma automática o la marca el admin? (🟡)
- **RF-40** — ¿Se cancela el recordatorio masivo por WhatsApp (como RF-41) o se define un canal? Hoy los avisos van solo por mail. (🟡)
- **Producción** — ¿Dominio definitivo, proveedor SMTP y fecha de pase? UNKNOWN.
- **`test` y `main` en linaje viejo**: ¿dejar `test` igual a `dev` (force-push, reescribe la rama remota) o resolver conflictos? Decide el dueño del repo antes de desplegar la demo en Vercel.

