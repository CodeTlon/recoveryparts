---
description: Cierra la sesión de mantenimiento (build, README/Changelog, merge a main, push, tag SemVer).
---

Cerrá la sesión de mantenimiento de la rama actual:

1. **Gate pre-push (local):** correr el MISMO gate que el CI antes de pushear — `npm run lint && npx tsc --noEmit && npm run build` (los tres tienen que pasar; si hay tests afectados, corrélos). Si algo falla, frená y avisá: no pushees un CI que ya sabés que va a salir rojo.
2. **Documentar la release:**
   - `README.md` (raíz) → agregá fila(s) al Changelog (`vX.Y.Z — <fecha> — qué cambió en la sesión`) + actualizá Setup/Scripts/Env/Deploy si cambió.
   - `docs/` y `ARCHITECTURE.md` → si la sesión los afecta.
   - `AGENTS.md` → fila en "Historial de Cambios" (+ Quirks/DB/Env si hubo cambio estructural).
   - `git add -A && git commit -m "docs: actualizar README/changelog y contexto"` (sin `Co-Authored-By`).
3. **Merge + versionar:**
   `git push -u origin <rama>`  (opcional: `gh pr create --base main ...`)
   `git checkout main && git merge --no-ff <rama>`
   `git tag vX.Y.Z`  (patch=fix · minor=feat · major=breaking)
   `git push origin main --tags`
4. **Confirmá:** README Changelog, ARCHITECTURE.md y `AGENTS.md` quedaron al día, y main está pusheado con el tag.
