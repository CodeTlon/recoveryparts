# Manual de pruebas manuales — Recovery Parts

Checklist para probar a mano lo que no cubre la suite automática. Cada ítem lleva el ID del requisito de `specs/`.

## REQ-INS-006 — Acceso del alumno finalizado (3 meses)
1. Entrar como admin y pasar la inscripción de un alumno a **Finalizado**.
2. Entrar como ese alumno: debe poder abrir su curso, ver el material liberado y bajar el ZIP.
3. En la base de pruebas, mover `finalizado_el` a hace más de 3 meses: el alumno ya no debe acceder al material.
4. Pendiente de confirmar con el cliente (RF-14): hoy el acceso dura 3 meses; la spec original decía «queda sin curso».
