# PROJECT — Recovery Parts

Academia de cursos y talleres técnicos presenciales (Córdoba, AR). Dos partes en una sola app Next.js 15:

- **Sitio público** (`/`, `/cursos`, `/cursos/[slug]`, `/galeria`): contenido administrable desde el CMS (`site_settings`, `cms_*`).
- **Campus virtual** (`/campus/{admin,profesor,alumno}`): el admin gestiona cursos, usuarios, material y encuestas; el profesor sube material a sus cursos; el alumno ve y descarga el material liberado.

## Stack
Next.js 15 (App Router) · Tailwind (paleta azul/naranja) · Postgres propio con RLS (`db/`, acceso por `src/lib/db`) · auth propia (cookie firmada, scrypt) · archivos en volumen del servidor · Coolify (Docker Compose) · GitHub Actions. Node 22 (Dockerfile y CI). Sin Supabase ni Vercel desde 2026-10-09.

## Quién decide
Mateo (CodeTlon) desarrolla; el cliente confirma los pendientes funcionales. Un 🟡 en la spec significa "falta definir el cómo": se pregunta antes de implementar.

## Fuentes de verdad
| Qué | Dónde |
|---|---|
| Requisitos funcionales (RF-xx), reglas de negocio | `docs/ESPECIFICACION-ACADEMIA.md` (v0.6) |
| Arquitectura detallada, modelo de datos, flujos | `docs/ARQUITECTURA.md` |
| Entornos y flujo de ramas | `docs/ENTORNOS.md` |
| Por qué se decidió algo | `DECISIONS.md` |
| Estado actual y pendientes | `CURRENT_STATE.md` |
