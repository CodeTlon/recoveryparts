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
