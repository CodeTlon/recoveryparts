# recoveryparts — memoria de sesion

> Contexto estable: `AGENTS.md` y `.ai/context/00_INDEX.md`. Este archivo guarda lo que cambia sesion a sesion (avisos, quirks, historial).

## Aviso
Ramas `feature/* -> dev -> test` por merge directo; solo `test -> main` va por PR (despliega produccion, con OK de Mateo). Nunca commit directo a `dev`, `test` ni `main`.

## Stack vigente (2026-10-16)
Next 16.4.2, React 19.3.1, TypeScript 6.0.3, Tailwind 4.3.3, ESLint 10.13.0, Postgres 16 (desplegado), Node 22. Excepciones: sesion propia y `postgres.js`. Fuente de versiones: `codetlon-cloud/.claude/modules/stack-versions.md`.

## Quirks
- `src/proxy.ts` reemplaza a `middleware.ts` (Next 16). Aplica tambien los encabezados de seguridad.
- La imagen Docker necesita `--build-arg NEXT_PUBLIC_SITE_URL=...` (sin eso, `Invalid URL`).
- `npm audit` completo muestra `braces` (cadena de `eslint-config-next`): es de lint y no tiene parche; el gate es `npm audit --omit=dev` en 0.
- Tailwind 4: sin clases pegadas a `${}` y sin utilidades propias llamadas `delay-`, `duration-`, etc.
- `useRef` en React 19 exige valor inicial.

## Historial de Cambios
| Fecha | Rama | Cambio |
|-------|------|--------|
| 2026-10-16 | feature/dev2-estandar-2026 | v0.15.0 — estandar de versiones de la flota (Next 16, React 19, Tailwind 4, ESLint 10 nuevo, `proxy.ts`). 36 E2E verdes, audit de runtime en 0. |
| 2026-10-15 | dev/test | v0.14.x — estandar de Coolify (Node 22, health con `started_at`, E2E, workflows, compose, fuentes autoalojadas, transcode). |
