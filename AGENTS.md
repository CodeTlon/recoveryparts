# Recovery Parts — sitio web + campus virtual

Academia de cursos y talleres técnicos (Córdoba). Next.js 15 (App Router) + Tailwind + Postgres plano con RLS; auth y archivos propios; se despliega con Docker en Coolify. Este archivo es lo único que se carga siempre; el detalle vive en `.ai/context/` (empezá por `00_INDEX.md` y leé solo lo que la tarea necesite) y en `docs/`.

## Comandos
```bash
npm run db:start && npm run db:migrate && npm run dev   # desarrollo: Postgres LOCAL (Docker) + app con .env.development
npm run seed:dev                  # cuentas/datos de PRUEBA locales (imprime contraseñas)
npm run db:reset                  # rehacer la base local desde las migraciones
npm run db:migrate:test | db:migrate:production   # migraciones a mano (en Coolify corren solas al arrancar la app)
npm run type-check && npm run build          # lo mismo que corre la CI
```
Sin `DATABASE_URL` el sitio compila y muestra vacíos; el campus redirige a `/login`.

## Entornos y ramas
**desarrollo** (local) → **homologación** (`test`, Coolify de pruebas) → **producción** (`main`). Ramas `feature/* → dev → test → main`: `feature → dev` y `dev → test` son **merge** directo; solo `test → main` es **PR**. Nunca commit directo a `dev`/`test`/`main`. Detalle: `docs/ENTORNOS.md`.

## Versiones que no hay que subir a ciegas
Node ≥ 20. `postgres` (postgres.js) está fijado en **3.4.5**. No hay ORM ni Supabase: el acceso a datos es `src/lib/db` (ver `.ai/context/ARCHITECTURE.md`).

## Seguridad (inamovible)
1. Autorización **en el servidor** y en la base: middleware + `requireRole()` + RLS en todas las tablas. Ocultar un botón no alcanza.
2. `clienteAdmin()` / `sqlAdmin()` (rol `service_role`, se saltea RLS) solo en server actions/route handlers y **después** de validar el rol (`import 'server-only'`). Nunca al cliente.
3. **No hay registro público.** Solo el admin crea usuarios, por invitación. El perfil y su rol se crean únicamente si `auth.users.invited_at` está seteado (migración 0006); no confiar en metadatos de un signUp.
4. Datos personales del alumno: solo nombre, apellido, email, teléfono. Nada de datos personales en URLs ni logs. Los tokens nunca se loguean.
5. Los PDFs viven en disco (`STORAGE_DIR/materiales`, fuera de `public/`); el alumno nunca los lee directo: pasa por `/api/material/[id]` (valida acceso). Solo `STORAGE_DIR/sitio` es público (`/media/…`).

## Reglas de producto (no implementar)
- **La academia no ofrece servicio técnico.** Hay *cursos de* reparación. Etiqueta pública del área: «Reparación y Tecnología».
- Sin **asistencia/faltas**, **pagos, cobros, cuotas, inscripción ni stock**. Solo precio de referencia.
- Sin **WhatsApp flotante ni bot**; avisos automáticos **por mail**. «Consultar por WhatsApp» es solo un enlace al chat.
- Solo modalidad **presencial**. Sin carreras ni cursos virtuales.
- **Desertor es estado final**; la inscripción **nunca se borra** (trigger). Motivo obligatorio; el N° de clase lo calcula la base (RF-55).
- Encuestas **anónimas**: la respuesta no guarda `alumno_id`.
- Sin datos mockeados: todo sale de la base (CMS en `site_settings`/`cms_*`).

## Base de datos
- **Nunca editar una migración ya aplicada**: se agrega una nueva (`db/migrations/NNNN_*.sql`) y se prueba con `npm run db:reset`.
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
