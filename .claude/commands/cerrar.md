---
description: Cierra la sesión de trabajo: verifica tipos y build, sincroniza .ai/context y la spec, y deja la rama lista para mergear a dev.
---

Cerrá la sesión actual:

1. **Verificá** (lo mismo que la CI): `npm run type-check` y `npm run build`. Si tocaste migraciones, `npm run db:reset` y confirmá que aplican desde cero. Si algo falla, arreglalo o avisá; no sigas.
2. **Sincronizá el contexto** con lo que cambió en la sesión:
   - `.ai/context/CURRENT_STATE.md`: sacá lo resuelto, agregá lo nuevo y actualizá la fecha.
   - `.ai/context/DECISIONS.md`: una fila por decisión (fecha, qué, por qué), las nuevas arriba.
   - `KNOWN_ISSUES.md` / `OPEN_QUESTIONS.md`: lo que apareció o se resolvió.
   - `docs/ESPECIFICACION-ACADEMIA.md`: si se cerró un 🟡, pasalo a 🟢/🔴 y sumá una línea al changelog.
   - `docs/ARQUITECTURA.md` / `docs/ENTORNOS.md`: solo si cambió algo que describen.
3. **Commit** de esos docs: `docs: cierre de sesión <tema>`.
4. **Resumí** al usuario: qué quedó hecho, qué quedó pendiente y la rama.
5. **No hagas push ni merge** salvo que el usuario lo pida. Si lo pide: merge de la rama a `dev` (sin PR). `dev → test` también es merge; solo `test → main` es PR.
