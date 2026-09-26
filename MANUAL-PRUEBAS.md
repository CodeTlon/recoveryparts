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
- [ ] Completar `/recuperar/nueva-clave` desde el link del mail → aterriza en el home del rol y el login viejo deja de funcionar
- [ ] Entrar a `/admin`, `/alumno` o `/profesor` sin sesión → redirige a `/login?next=...`
- [ ] Loguearse como alumno e intentar entrar a `/admin` manualmente por URL → redirige a `/alumno` (no accede)
- [ ] Cerrar sesión desde el botón del sidebar → vuelve a pedir login al reintentar entrar al campus
