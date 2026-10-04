# CONVENTIONS — Recovery Parts

## Código
- UI en español rioplatense (voseo). Comentarios con el ID del requisito (`RF-xx`) cuando implementan uno.
- Server actions de admin en `src/app/campus/admin/actions.ts`; el tipo de retorno `R` es `{ ok?, error? }`.
- Formularios con `ActionForm`/`Field` de `src/components/campus/ui.tsx`.
- Todo archivo que use `SUPABASE_SERVICE_ROLE_KEY` lleva `import 'server-only'`.
- Sin datos mockeados: si no hay datos, la pantalla muestra el vacío.
- Nada de datos personales ni tokens en URLs ni logs.

## Estilos
Tokens en `tailwind.config.ts` + clases `btn-*`, `card`, `input`, `badge` en `src/app/globals.css`. Paleta azul/naranja/blanco (RNF-01). Un solo sistema de diseño: no reintroducir tokens `demo-*`.

## Base de datos
- Nunca editar una migración aplicada: nueva `NNNN_descripcion.sql`, probada con `npm run db:reset`.
- Toda tabla nueva lleva `enable row level security` y políticas por rol; la CI falla si falta.
- Cambios a `es_admin()`/helpers: re-verificar anónimo y desertor.

## Git
- Ramas `feature/*` (o `feat/`, `fix/`, `style/`, `docs/`) → `dev` → `test` por merge; `test` → `main` por PR (el único).
- Commits convencionales (`feat:`, `fix:`, `style:`, `docs:`, `chore:`).
- Cerrar un pendiente de la spec: 🟡 → 🟢/🔴, changelog de la spec y fila en `DECISIONS.md`.
- URLs libres (video, imagen, foto, link de material): validar con `urlOpcional()`/`hrefSeguro()` de `src/lib/validar.ts`; los archivos subidos se verifican por su firma, no por el `type` del cliente.
