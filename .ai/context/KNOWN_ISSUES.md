# KNOWN_ISSUES — Recovery Parts

Restricciones y riesgos a tener en cuenta (no son bugs para arreglar ya).

## El contexto se desincroniza si nadie fuerza el proceso
Si se edita código sin actualizar `.ai/context/` (y la spec) en el mismo cambio, los docs mienten. `/cambio` y `/cerrar` existen para forzarlo; sin esa disciplina el riesgo vuelve.

## Node 20 limita las versiones de Supabase
`supabase-js` 2.100.0 y `ssr` 0.9.0 fijados. Subirlos exige Node 22 en local, CI y Vercel a la vez.

## El Auth remoto permite registro público hasta que se desactive en el panel
Está cerrado en la base (migración 0006: perfil solo con `invited_at`) y en `config.toml` local, pero en los proyectos remotos hay que apagarlo a mano en el panel de Auth.

## Sin tests automáticos de UI ni de políticas RLS
La CI verifica tipos, build, migraciones, RLS activo en todas las tablas y que un signUp público no cree perfil. No prueba las políticas por rol ni las pantallas.

## El mail de aviso de contactos requiere configuración externa
El formulario guarda en `contactos` (bandeja del admin); el aviso por mail necesita webhook/SMTP (`docs/SETUP-SUPABASE.md`).

## Cuentas y secretos
`docs/CUENTAS-HOMOLOGACION.md`, `.env.test` y `.env.production` están gitignored. Nunca pegar claves en el chat ni en commits.

## Sin verificar en navegador tras la auditoría
La CSP (`next.config.js`) y la reactivación de cuentas (`ban_duration: 'none'` en `setEstadoCuenta`) se probaron solo por código y headers. Revisar en homologación que no bloqueen imágenes ni el iframe del PDF, y que un usuario reactivado pueda entrar.

## Rate limit en memoria
`src/lib/rate-limit.ts` cuenta por instancia serverless (mejor esfuerzo). Para un límite real hace falta un store compartido (tabla en Postgres o Upstash).

## Respuestas de encuesta por número de pregunta
Se guardan por índice, no por id. Por eso `guardarEncuesta` bloquea cambiar las preguntas de una encuesta con respuestas. Un id estable por pregunta lo resolvería.

## Sin hacer de la auditoría
`ImageUploader` y los formularios públicos (`ContactForm`, `DemandaForm`, `AuthForms`) no usan `ActionForm`. El `bodySizeLimit` de 26 MB sigue global (los PDFs lo necesitan). El ZIP se arma en memoria.

## Abiertos tras la sesión 2026-10-05
- **Fotos de ejemplo**: las imágenes de cursos/talleres del seed son flyers viejos de `public/images` (mencionan «4 cuotas», precios y «mes de junio»). Chocan con la regla «sin pagos/cuotas» y no corresponden a cada curso: reemplazar por fotos finales (con consentimiento).
- **Sin probar en navegador**: pestaña Material del curso (admin) y la ficha pública de cada taller en tablet más allá de lo medido.
- **Cuentas viejas en homologación**: se borraron a mano con SQL (los triggers impiden borrar inscripciones). Si reaparecen cuentas `@homologacion.example.com`, repetir.
- **Deploy de Vercel**: los deploys automáticos de Git fallaron con «Builder returned invalid routes». La causa hallada fue la `ñ` en `añadirAlumno` (arreglada), pero **no se confirmó** que el deploy de la nube ya pase; revisar el próximo build.
- **Homologación**: tiene el esquema 0001–0008; hay que aplicar la 0009 y volver a correr `seed:test` para ver el kit nuevo y el admin «Maxi Escaroni».
- **Acción «Migraciones a Supabase»** falla en GitHub por falta del secreto `SUPABASE_DB_URL`.

