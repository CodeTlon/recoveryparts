---
description: Abre una sesión de trabajo (crea la rama desde dev). Cada pedido se commitea acá; no hace push ni merge hasta /cerrar.
---

Tema de la sesión: $ARGUMENTS

Abrí una sesión de trabajo:

1. **Contexto:** ya tenés `AGENTS.md` cargado. Leé `.ai/context/00_INDEX.md` y después SOLO el archivo de `.ai/context/` que corresponda a cada cambio (no releas el repo entero ni todo el directorio).
2. **Elegí el tipo** según el trabajo (inferilo; si el usuario lo indica, respetalo): `feat/` · `fix/` · `style/` · `refactor/` · `chore/` · `docs/`.
3. **Crear la rama desde `dev`:**
   `git checkout dev && git pull origin dev`
   `git checkout -b <tipo>/<tema-corto>`
4. **Avisá:** "Sesión abierta en `<tipo>/<tema>`. Voy a commitear acá por cada pedido. No hago push ni merge hasta que digas `/cerrar`."

En CADA pedido de la sesión:
- Implementá lo pedido leyendo solo los archivos necesarios.
- Si toca un requisito 🟡 de la spec: **preguntá antes de implementar**.
- `git add` + `git commit` granular y convencional.
- Si el cambio fue estructural, actualizá en el mismo commit el archivo de `.ai/context/` que corresponda (`DOMAIN.md` datos, `ARCHITECTURE.md` arquitectura, `CONVENTIONS.md` patrón nuevo, `DECISIONS.md` decisión, `ENVIRONMENTS.md` entornos) y `AGENTS.md` si cambia una regla inamovible.
- Si agregás una tabla: migración nueva con RLS + políticas por rol. Nunca edites una migración aplicada.
- **NO** `git push`, **NO** merge, **NO** commits en `dev`/`test`/`main`.

Si ya estás en una rama de trabajo (no `dev`/`test`/`main`), seguís en la misma sesión; no abras otra salvo que el usuario lo pida.
