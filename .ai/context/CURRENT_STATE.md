# CURRENT_STATE — Recovery Parts

Qué es verdad ahora (2026-10-02). Esto envejece rápido: si pasó más de un mes, verificá contra el código y git antes de confiar.

## Ramas
- `dev` tiene el rediseño del sitio y del campus (merge de `feat/implementacion-claude`), **11 commits adelante de `test` y `main`**. Falta el merge `dev → test` para llevarlo a homologación.
- `feat/unificacion` (local) sin mergear. `feature/implementacion-claude` y `feat/implementacion-claude` duplicadas en el remoto.

## Pendientes de la spec (🟡, preguntar antes de implementar)
RF-03 (aulas/cupos/insumos/precios), RF-12 y RF-13 (alta de alumno con curso / vincular a curso nuevo), RF-14 (al finalizar queda sin curso), RF-40 (recordatorios masivos por WhatsApp; choca con «avisos solo por mail», probablemente se cancele).

## Pendientes operativos (sin verificar al 2026-10-02)
SMTP propio y plantillas de Auth apuntando a `/auth/confirm` · desactivar el registro público en el Auth remoto · rotar las claves y la contraseña de base que se compartieron por chat · crear el proyecto Supabase de producción · proteger ramas y crear environments en GitHub · imágenes finales sin flyers viejos y con consentimiento · dominio.

## Hecho
Tres entornos armados, CI con RLS obligatorio, homologación funcionando, rediseño del sitio y del campus en `dev`.
