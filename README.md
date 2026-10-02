# Recovery Parts — sitio web + campus virtual

Academia de cursos y talleres técnicos. Next.js 15 + Tailwind + Supabase.

- Sitio público: `/`, `/cursos`, `/cursos/[slug]`, `/galeria` (contenido desde el CMS).
- Campus: `/login` → `/campus/{admin,profesor,alumno}` (autorización por rol en servidor + RLS).
- No incluye pagos, inscripciones, asistencia ni stock (los maneja software externo).

## Desarrollo
```bash
npm install
npm run db:start    # Supabase local (requiere Docker)
npm run seed:dev    # cuentas y cursos de prueba (opcional)
npm run dev         # http://localhost:3000
```
Requiere Node ≥ 20 y Docker. Entornos y ramas: `docs/ENTORNOS.md`.

## Documentación
- `CLAUDE.md` — contexto de alto nivel y reglas del proyecto.
- `docs/ESPECIFICACION-ACADEMIA.md` — especificación funcional (v0.6).
- `docs/ENTORNOS.md` — entornos, ramas, CI y configuración única.
- `docs/ARQUITECTURA.md` — capas, seguridad, modelo de datos y flujos.
- `.ai/context/DECISIONS.md` — registro de decisiones.
- `docs/SETUP-SUPABASE.md` — puesta en marcha de la base y Auth.
