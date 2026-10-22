---
sdd: v1
perfil: Retrofit
---
# Specs del proyecto

Método: SDD CodeTlon (`sdd: v1`), retrofit mínimo sobre un proyecto en producción. Validador: `node scripts/spec-lint.mjs`. Doctrina: `.claude/modules/sdd.md` de codetlon-cloud. El detalle funcional completo sigue en `docs/ESPECIFICACION-ACADEMIA.md` (RF-xx); estas specs son el contrato verificable de las capacidades que cuestan caro si se rompen.

| Capacidad | Archivo | REQ | Estado |
|-----------|---------|-----|--------|
| INS inscripciones y estados | `inscripciones/spec.md` | 6 | semilla (1 gap, RF-14 en OPEN_QUESTIONS) |
| CAL calendario y avisos | `calendario/spec.md` | 5 | semilla |
| ACC acceso, roles e invitaciones | `acceso/spec.md` | 10 | semilla |

## Cambios abiertos
Ver `changes/`. Cerrados: `_archive/`.

## Reglas rápidas
- Bugfix, contenido, dependencias: sin spec (test de regresión + `ERRORES.md`).
- Feature nueva o cambio de comportamiento: `/spec` abre un delta en `changes/`.
- Los tests llevan el ID del REQ en su nombre (`[REQ-XXX-NNN]`) o en un comentario (SQL).
- Las specs son privadas del cliente; no entran en la propuesta comercial.
