# Recovery Parts — sitio web + campus virtual

Academia de cursos y talleres técnicos (Córdoba). Next.js 15 (App Router) + Tailwind + Supabase (Auth, Postgres con RLS, Storage). Este archivo es lo único que se carga siempre; el detalle vive en `.ai/context/` (empezá por `00_INDEX.md` y leé solo lo que la tarea necesite) y en `docs/`.

## Comandos
```bash
npm run db:start && npm run dev   # desarrollo: Supabase LOCAL (Docker) + app con .env.development
npm run seed:dev                  # cuentas/datos de PRUEBA locales (imprime contraseñas)
npm run db:reset                  # rehacer la base local desde las migraciones
npm run dev:test                  # app local contra homologación (.env.test)
npm run db:push:test | db:push:production   # aplicar migraciones (pide confirmación)
npm run type-check && npm run build          # lo mismo que corre la CI
```
Sin variables de Supabase el sitio compila y muestra vacíos; el campus redirige a `/login`.

## Entornos y ramas
**desarrollo** (local) → **homologación** (`test`, Supabase remoto de pruebas) → **producción** (`main`). Ramas `feature/* → dev → test → main`: `feature → dev` y `dev → test` son **merge** directo; solo `test → main` es **PR**. Nunca commit directo a `dev`/`test`/`main`. Detalle: `docs/ENTORNOS.md`.

## Versiones que no hay que subir a ciegas
Node ≥ 20. `@supabase/supabase-js` **2.100.0** y `@supabase/ssr` **0.9.0** están fijados (las nuevas exigen Node 22 y rompen en Node 20).

## Seguridad (inamovible)
1. Autorización **en el servidor** y en la base: middleware + `requireRole()` + RLS en todas las tablas. Ocultar un botón no alcanza.
2. `SUPABASE_SERVICE_ROLE_KEY` solo en server actions/route handlers, nunca al cliente (`import 'server-only'`).
3. **No hay registro público.** Solo el admin crea usuarios, por invitación. El perfil y su rol se crean únicamente si `auth.users.invited_at` está seteado (migración 0006); no confiar en metadatos de un signUp.
4. Datos personales del alumno: solo nombre, apellido, email, teléfono. Nada de datos personales en URLs ni logs. Los tokens nunca se loguean.
5. Los PDFs viven en un bucket privado; el alumno nunca lee Storage directo: pasa por `/api/material/[id]` (valida acceso).

## Reglas de producto (no implementar)
- **La academia no ofrece servicio técnico.** Hay *cursos de* reparación. Etiqueta pública del área: «Reparación y Tecnología».
- Sin **asistencia/faltas**, **pagos, cobros, cuotas, inscripción ni stock**. Solo precio de referencia.
- Sin **WhatsApp flotante ni bot**; avisos automáticos **por mail**. «Consultar por WhatsApp» es solo un enlace al chat.
- Solo modalidad **presencial**. Sin carreras ni cursos virtuales.
- **Desertor es estado final**; la inscripción **nunca se borra** (trigger). Motivo obligatorio; el N° de clase lo calcula la base (RF-55).
- Encuestas **anónimas**: la respuesta no guarda `alumno_id`.
- Sin datos mockeados: todo sale de la base (CMS en `site_settings`/`cms_*`).

## Base de datos
- **Nunca editar una migración ya aplicada**: se agrega una nueva (`NNNN_*.sql`) y se prueba con `npm run db:reset`.
- Toda tabla nueva lleva RLS + políticas por rol (la CI falla si falta).
- Nunca correr `seed:*` contra producción (el script se niega si `APP_ENV` no es development/test).

## Convenciones mínimas
- Español rioplatense en la UI (voseo). Comentarios con el ID del requisito (`RF-xx`) cuando implementan uno.
- Server actions de admin en `src/app/campus/admin/actions.ts` (tipo `R` = `{ ok?, error? }`); formularios con `ActionForm`/`Field` de `src/components/campus/ui.tsx`.
- Más en `.ai/context/CONVENTIONS.md`.

## Flujo de trabajo
- Antes de tocar nada: `/cambio` (lee el contexto justo, crea rama `feat/`/`fix/`/`style/`/`docs/`…).
- Al terminar: `/cerrar` (type-check + build, actualiza `.ai/context/`, spec y changelog, commit). No hace push ni PR sin pedido explícito.
- Un 🟡 de la spec **se pregunta antes de implementar**; al cerrarlo pasa a 🟢/🔴 y se registra en `.ai/context/DECISIONS.md`.
- Si editás código sin actualizar `.ai/context/` en el mismo cambio, el contexto se desincroniza (ver `KNOWN_ISSUES.md`).
