# Recovery Parts — sitio web + campus virtual

Academia de cursos y talleres técnicos (Córdoba). Next.js 15 (App Router) + Tailwind + Supabase (Auth, Postgres con RLS, Storage). Fuente de verdad funcional: `docs/ESPECIFICACION-ACADEMIA.md` (v0.6). Arquitectura: `docs/ARQUITECTURA.md`. Entornos y flujo: `docs/ENTORNOS.md`. Decisiones: `docs/DECISIONES.md`.

## Comandos
```bash
npm run db:start && npm run dev   # desarrollo: Supabase LOCAL (Docker) + app con .env.devment
npm run seed:dev                  # cuentas/datos de PRUEBA locales (imprime contraseñas)
npm run db:reset                  # rehacer la base local desde las migraciones
npm run dev:test               # app local contra homologación (.env.test)
npm run db:push:test | db:push:production   # aplicar migraciones (pide confirmación)
npm run build | type-check
```
Tres entornos: **desarrollo** (local) → **homologación** (`test`, Supabase remoto de pruebas) → **producción** (`main`). Ramas `feature/* → dev → test → main`, siempre por PR. Detalle en `docs/ENTORNOS.md`.
Sin variables de Supabase el sitio compila y muestra vacíos; el campus redirige a `/login`.

## Versiones que no hay que subir a ciegas
Node ≥ 20. `@supabase/supabase-js` **2.100.0** y `@supabase/ssr` **0.9.0** están fijados (las versiones nuevas exigen Node 22 y rompen en Node 20).

## Mapa
- `src/app/` sitio público (`/`, `/cursos`, `/cursos/[slug]`, `/galeria`), auth (`/login`, `/activar`, `/olvide-mi-contrasena`, `/auth/confirm`), campus `/campus/{admin,profesor,alumno}`, API `/api/material/[id]` y `/api/curso/[id]/zip`.
- `src/lib/` clientes Supabase (`supabase/{client,server,admin}.ts`), `auth.ts` (`requireRole`), `data.ts` (lectura pública/CMS), `mail.ts`, `types.ts`.
- `src/middleware.ts` sesión + rol + cuenta activa en `/campus/*`.
- `supabase/migrations/0001–0006` esquema, funciones/triggers, RLS, storage, seguridad de alta de usuarios. `supabase/config.toml` (Supabase local, registro público desactivado) y `supabase/templates/` (mails de Auth). `scripts/` seed de pruebas y `db-push`.

## Seguridad (inamovible)
1. Autorización **en el servidor** y en la base: middleware + `requireRole()` + RLS en todas las tablas. Ocultar un botón no alcanza.
2. `SUPABASE_SERVICE_ROLE_KEY` solo en server actions/route handlers, nunca al cliente (`import 'server-only'`).
3. **No hay registro público.** Solo el admin crea usuarios, por invitación. El perfil y su rol se crean únicamente si `auth.users.invited_at` está seteado (migración 0006); no confiar en metadatos de un signUp.
4. Datos personales del alumno: solo nombre, apellido, email, teléfono. Nada de datos personales en URLs ni logs. Los tokens nunca se loguean.
5. Los PDFs viven en un bucket privado; el alumno nunca lee Storage directo: pasa por `/api/material/[id]` (valida acceso).

## Reglas de producto (no implementar)
- **La academia no ofrece servicio técnico.** Hay *cursos de* reparación; no mencionar servicio técnico como oferta. Etiqueta pública del área: «Reparación y Tecnología».
- Sin **asistencia/faltas** (las lleva un software externo), sin **pagos, cobros, cuotas, inscripción ni stock**. Solo se muestra un precio de referencia.
- Sin **WhatsApp flotante ni bot**; avisos automáticos **por mail**. Los botones «Consultar por WhatsApp» son solo enlaces al chat.
- Solo modalidad **presencial**. Sin carreras ni cursos virtuales.
- **Desertor es estado final** y la inscripción **nunca se borra** (trigger en la base). Motivo obligatorio; el N° de clase lo calcula la base (RF-55).
- Encuestas **anónimas**: la respuesta no guarda `alumno_id`.
- Sin datos mockeados: todo sale de la base (CMS en `site_settings`/`cms_*`).

## Base de datos
- **Nunca editar una migración ya aplicada**: se agrega una nueva (`NNNN_*.sql`) y se prueba con `npm run db:reset`.
- Toda tabla nueva lleva RLS + políticas por rol (la CI falla si falta).
- Nunca correr `seed:*` contra producción (el script se niega si `APP_ENV` no es devment/test).

## Convenciones
- Español rioplatense en la UI (voseo). Comentarios con el ID del requisito (`RF-xx`) cuando implementan uno.
- Server actions de admin en `src/app/campus/admin/actions.ts`; el tipo `R` es `{ ok?, error? }`. Formularios con `ActionForm`/`Field` de `src/components/campus/ui.tsx`.
- Estilos: tokens en `tailwind.config.ts` + clases `btn-*`, `card`, `input`, `badge` en `globals.css`. Paleta azul/naranja/blanco (RNF-01).
- Al cerrar un pendiente de la spec: cambiar 🟡→🟢/🔴 y registrar en el changelog y en `docs/DECISIONES.md`.
