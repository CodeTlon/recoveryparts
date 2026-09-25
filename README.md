# Recovery Parts

Sitio público + campus virtual de Recovery Parts, academia de capacitación técnica en Córdoba, Argentina. Construido a partir de un demo de venta; el alcance funcional completo vive en `docs/ESPECIFICACION.md`.

## Stack

Next.js 15.5.25 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth + Postgres + RLS) · Resend.

## Setup

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # build de producción (para Lighthouse)
npx playwright test  # E2E
```

Variables de entorno: ver `AGENTS.md` → "Variables de Entorno" y `.env.example`.

## Contexto para desarrollo (humano o IA)

- `AGENTS.md` — identidad del proyecto, stack, roles, rutas, env, quirks.
- `ARCHITECTURE.md` — esquema de datos, RLS, flujo de auth.
- `docs/ESPECIFICACION.md` — especificación funcional completa (RF-01 a RF-57).
- `TASKS.md` — roadmap de implementación.

## Licencia

Software propietario de CodeTlon / Recovery Parts (all-rights-reserved). Ver `LICENSE`.

## Changelog

| Versión | Fecha | Cambio |
|---|---|---|
| v0.1.0 | 2026-09-25 | Fundación del proyecto real: repo, limpieza de dead code del demo, contexto (`AGENTS.md`/`ARCHITECTURE.md`), `TASKS.md` con el desglose de RF-01 a RF-57 |
