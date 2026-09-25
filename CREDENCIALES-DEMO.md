# Credenciales demo — Recovery Parts

Usuarios mock para grabar el Loom. **No hay auth real**: cualquier password entra,
el rol se decide por el email. Dentro del campus hay un switcher "Vista demo"
para saltar entre roles sin volver a loguear.

| Rol           | Nombre        | Email                          | Password   |
|---------------|---------------|--------------------------------|------------|
| Administrador | Maxi Escaroni | admin@recoveryparts.com.ar     | demo1234   |
| Profesor      | Diego Ramírez | profe@recoveryparts.com.ar     | demo1234   |
| Alumno        | Lucas Díaz    | alumno@recoveryparts.com.ar    | demo1234   |

Login en `/login`. Fuente: `src/lib/demo-users.ts`.
