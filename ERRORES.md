# ERRORES — Recovery Parts

Bugs corregidos sin spec (regla SDD de `specs/README.md`): qué pasaba, por qué y qué test lo cubre ahora.

## 2026-10-27 — PDFs de más de 10 MB daban error 500
- **Síntoma:** el profesor (o el admin) subía un PDF de entre 10 y 25 MB, que el formulario promete aceptar, y la pantalla quedaba sin mensaje; el servidor respondía 500 (`Unexpected end of form`). Con más de 25 MB tampoco aparecía «El PDF supera los 25 MB.» (caso CP-MAT-06).
- **Causa:** `proxy.ts` corre delante de las server actions y Next le limita el cuerpo a 10 MB por defecto (`proxyClientMaxBodySize`): truncaba el multipart antes de que la acción lo leyera. El tope de las server actions (26 MB) tampoco dejaba margen sobre los 25 MB del PDF.
- **Arreglo:** `next.config.js` con `proxyClientMaxBodySize` y `serverActions.bodySizeLimit` en 30 MB; el campo de archivo marca inválido un PDF de más de 25 MB antes de enviarlo (`FileField maxBytes`).
- **Test:** `tests/e2e/campus.spec.ts` › «regresión: el profesor sube un PDF de 12 MB y uno de más de 25 MB recibe el aviso».

## 2026-10-27 — Campus › Aulas no listaba ninguna aula
- **Síntoma:** la pantalla decía «Todavía no hay aulas cargadas» aunque hubiera aulas; no se podía editar la capacidad ni dar de baja un aula desde el campus (caso CP-AUL-02). En el log: `db: select aulas falló — Relación aulas → cursos inexistente`.
- **Causa:** la consulta embebía `cursos(...)` desde `aulas`, pero desde la migración 0011 el aula y el cupo están en `ediciones`.
- **Arreglo:** la página lee `ediciones(..., cursos(...))` y cuenta como «en uso» las ediciones activas de cursos activos, igual que el trigger `aulas_before_write`.
- **Test:** `tests/e2e/campus.spec.ts` › «regresión: Campus › Aulas lista las aulas cargadas».

## 2026-10-27 — El seed de pruebas dejaba todo sin aula en una base nueva
- **Síntoma:** después de `npm run db:reset` + `npm run seed:dev`, ningún curso tenía aula y la sección «Aulas» del sitio salía vacía, sin ningún error.
- **Causa:** las aulas base las carga `db/seed.sql`, que solo corre con `migrate.mjs --seed`; el seed hacía `update` de la capacidad y, sin filas, no fallaba.
- **Arreglo:** `scripts/seed-pruebas.mts` hace `upsert` de Aula 1, 2 y 3.
- **Verificación:** base nueva sin `db/seed.sql` → 3 aulas, 0 ediciones sin aula, 3 fichas.

## 2026-10-27 — `anon` recuperaba los permisos por defecto en cada arranque
- **Síntoma:** después del segundo `migrate.mjs` (en Coolify, cada deploy), `pg_default_acl` volvía a dar `arwdDxt` a `anon` sobre toda tabla nueva de `public`.
- **Causa:** `db/bootstrap.sql` corre siempre y hacía `grant all on tables to anon`, deshaciendo el `revoke` por defecto de la 0028.
- **Arreglo:** el bootstrap da los permisos por defecto solo a `authenticated` y `service_role`, y revoca los de `anon` (una base ya afectada se corrige en el próximo arranque). Los permisos explícitos de `anon` quedan idénticos.

## 2026-10-27 — Una cuenta deshabilitada «entraba» y quedaba en una URL del campus
- **Síntoma:** con la contraseña correcta, el login abría la sesión, el proxy la rebotaba y la barra quedaba en `/campus/<rol>` mostrando el formulario de login.
- **Arreglo:** el login valida `estado_cuenta` antes de abrir la sesión y responde «Tu cuenta no está activa. Contactá a la academia.».
