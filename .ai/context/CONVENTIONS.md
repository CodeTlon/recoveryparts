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
- Componentes del campus repetidos: `BackLink` (volver), `EstadoBadge` (estado de inscripción), `Check` (checkbox con etiqueta). `ActionForm<S>` acepta una acción que devuelva datos extra y un `onSuccess` (ej. `CursoForm` redirige al crear). Diálogos modales: `useModalFocus` (`src/lib/useModalFocus.ts`) para foco y Tab.
- Formularios: `ActionForm`/`Field`/`Select`/`SubmitButton` salen de `components/campus/ui` (la parte interactiva está en `forms.tsx`). Un `<form action={...}>` simple usa `SubmitButton` para deshabilitarse al enviar. Fechas «de hoy»: `hoyAR()` (`src/lib/fechas.ts`), nunca `new Date().toISOString()`.
- URLs libres (video, imagen, foto, link de material): validar con `urlOpcional()`/`hrefSeguro()` de `src/lib/validar.ts`; los archivos subidos se verifican por su firma, no por el `type` del cliente.

## Formularios del campus (patrones nuevos)
- **Modales**: `ModalButton` (`components/campus/Modal.tsx`, `<dialog>` nativo). Un `ActionForm` dentro se cierra solo al guardar. Nada de `alert()`/`confirm()`: las acciones destructivas usan `Confirm` (mantener apretado; con teclado abre un modal propio).
- **Listas por filas** (`ListEditors.tsx`: horarios, módulos, kit, clases): serializan al mismo texto que ya parsean las server actions (`guardarHorarios`, etc.) en un `<textarea hidden>`. Un `Guard` bloquea el envío con el mensaje de validación, para no guardar una lista a medias.
- **Imágenes**: `ImageField` sube a `sitio` (`subirImagen`) y guarda la URL; no pedir URLs pegadas.
- **Rangos**: `Field` acepta `min/max/step`; el servidor revalida (`guardarCurso`) y la base tiene los `check`.
- **Gráficos**: SVG propio en `components/campus/charts.tsx` (sin librerías).
- **Seed de demo**: `seed:dev`/`seed:test` crean cuentas `@demo.example.com` (contraseña `demo1234`), 5 cursos y 4 talleres cortos.
