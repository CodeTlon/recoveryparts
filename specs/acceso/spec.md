---
capacidad: ACC
perfil: Retrofit
rutas: src/proxy.ts, src/app/auth, src/app/login, src/app/activar, src/app/campus
---
# Acceso, roles e invitaciones

Cada persona entra solo a la sección de su rol (admin, profesor, alumno), no hay registro público y las sesiones se pueden cortar. Semilla de retrofit: describe lo que ya cubren los E2E de auth y campus; reglas inamovibles en `AGENTS.md › Seguridad`.

## Requisitos

### REQ-ACC-001 [must] Cada rol entra solo a su sección
El sistema DEBE redirigir a cada usuario a la sección de su rol cuando pide la de otro rol, validándolo en el servidor.
- Escenario: Dado un alumno logueado, Cuando abre `/campus/admin`, Entonces termina en `/campus/alumno`; un profesor pidiendo `/campus/admin` o `/campus/alumno` termina en `/campus/profesor`.
- verify: e2e tests/e2e/campus.spec.ts
- confianza: confirmado

### REQ-ACC-002 [must] El alumno ve solo lo suyo
El sistema NO DEBE mostrar a un alumno el curso de otra persona, ni listándolo ni pidiendo su edición por URL.
- Escenario: Dado un alumno con su curso, Cuando abre `/campus/alumno/curso/<edición ajena>`, Entonces no aparece ningún dato del curso ajeno.
- verify: e2e tests/e2e/campus.spec.ts
- confianza: confirmado

### REQ-ACC-003 [must] El profesor ve solo lo que dicta
El sistema DEBE mostrar al profesor únicamente los cursos que dicta (RF-04).
- Escenario: Dado un profesor con una edición asignada, Cuando abre su panel, Entonces ve esa edición y ninguna ajena.
- verify: e2e tests/e2e/campus.spec.ts
- confianza: confirmado

### REQ-ACC-004 [must] La invitación no se gasta al abrirla
El sistema NO DEBE consumir el token de invitación con un GET (abrir el link); DEBE consumirlo en el POST de "Continuar", y la sesión de activación NO DEBE dar acceso al campus.
- Escenario: Dado un link de invitación, Cuando se abre y se pulsa Continuar, Entonces el token queda usado solo tras el POST y `/campus/alumno` redirige a `/login`.
- verify: e2e tests/e2e/auth.spec.ts
- confianza: confirmado

### REQ-ACC-005 [must] Invitación de un solo uso
El sistema DEBE permitir definir la contraseña con la invitación, entrar a la sección del rol, y NO DEBE permitir reutilizar el mismo link.
- Escenario: Dado una invitación ya usada, Cuando se vuelve a abrir el link, Entonces no permite activar de nuevo.
- verify: e2e tests/e2e/auth.spec.ts
- confianza: confirmado

### REQ-ACC-006 [must] El logout invalida la cookie
El sistema DEBE dejar de aceptar la cookie de sesión anterior después de cerrar sesión.
- Escenario: Dado un usuario que cerró sesión, Cuando se reinyecta su cookie vieja y abre el campus, Entonces redirige a `/login`.
- verify: e2e tests/e2e/auth.spec.ts
- confianza: confirmado

### REQ-ACC-007 [must] Error de login genérico
El sistema NO DEBE revelar si un email existe: ante credenciales inválidas DEBE mostrar "Email o contraseña incorrectos".
- Escenario: Dado un email inexistente, Cuando se intenta ingresar, Entonces el formulario muestra el mensaje genérico.
- verify: e2e tests/e2e/auth.spec.ts
- confianza: confirmado

### REQ-ACC-008 [must] Deshabilitar corta la sesión
El sistema DEBE cortar al instante la sesión de un alumno cuando el admin lo deshabilita (cuenta `inactiva`).
- Escenario: Dado un alumno con sesión abierta, Cuando el admin lo deshabilita, Entonces su próxima visita al campus redirige a `/login`.
- verify: e2e tests/e2e/campus.spec.ts
- confianza: confirmado

### REQ-ACC-009 [must] Alta de usuarios desde el formulario del admin
El sistema DEBE permitir al admin crear un usuario desde el formulario de Usuarios, que queda invitado.
- Escenario: Dado el admin en Usuarios, Cuando completa el formulario de alta, Entonces el usuario queda creado con su invitación.
- verify: e2e tests/e2e/campus.spec.ts
- confianza: confirmado

### REQ-ACC-010 [must] Sin registro público
El sistema NO DEBE ofrecer registro público: el perfil y su rol solo se crean para usuarios invitados (`AGENTS.md › Seguridad`, punto 3).
- Escenario: Dado un visitante sin cuenta, Cuando recorre el sitio y `/login`, Entonces no encuentra ninguna ruta ni formulario de alta propia.
- verify: manual MANUAL-PRUEBAS.md#REQ-ACC-010
- confianza: inferido
