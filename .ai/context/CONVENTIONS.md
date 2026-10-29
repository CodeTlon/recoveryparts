# CONVENTIONS — Recovery Parts

## Código
- UI en español rioplatense (voseo). Comentarios con el ID del requisito (`RF-xx`) cuando implementan uno.
- Server actions de admin en `src/app/campus/admin/actions.ts`; el tipo de retorno `R` es `{ ok?, error? }`.
- Una pantalla común a varios roles va en **una ruta por rol** (`/campus/<rol>/cuenta`) que muestra el mismo componente (`MiCuenta`): el middleware solo deja pasar `/campus/<rol>/…` y no se le abren excepciones.
- El menú del campus (`NAV` en `CampusShell`) admite `match` (prefijo que marca el ítem activo) y recibe `avisos` (ruta → cantidad) desde el layout.
- Formularios con `ActionForm`/`Field` de `src/components/campus/ui.tsx`.
- Todo archivo que maneje secretos o acceso a datos del servidor (`db`, `storage`, `mail`, hash de contraseñas) lleva `import 'server-only'`.
- Sin datos mockeados: si no hay datos, la pantalla muestra el vacío.
- Nada de datos personales ni tokens en URLs ni logs.

## Estilos
**Sistema fijado en `design.md`** (desde v0.17.0): leerlo antes de tocar UI. Tokens en el `@theme` de `src/app/globals.css` (OKLCH; los nombres no cambian) + utilidades `display`, `dato`, `btn-*`, `card`, `input`, `label`, `badge`, `tabla`. Paleta navy/naranja + azul y verde del logo solo como señal de área (RNF-01). Un solo sistema de diseño: no reintroducir tokens `demo-*`.
- Títulos: `display` (Archivo al 118 %), caja normal, sin itálica ni `<em>` resaltado. Nada de `uppercase tracking-*` en botones, labels ni badges.
- Área de un curso: `AREA_COLOR` (`CursoCard.tsx`); no armar clases `text-${…}` (Tailwind no las detecta).
- Animaciones: las de scroll van en CSS (`al-entrar`, `pista-trazo`, `progreso-pagina`, `fila-foco`, `paralaje`); todo bajo `prefers-reduced-motion`. No bajar la opacidad del contenido que entra (contraste). Un título animado usa `TituloExpandido` (deja la copia estática que fija el layout).
- Un valor (objeto, constante) que necesite el servidor no se exporta desde un archivo `'use client'`: llega como referencia de cliente. Va en `src/lib/` (pasó con las etiquetas de la galería, ya sacada).
- Canvas o capas que pueden quedar ocultos (`hidden lg:flex`): no dibujar con tamaño 0 (`drawImage` de una capa 0×0 tira error).
- Campus: una página = una tarea. Si junta varias, van en pestañas con `Pestanas` (`?tab=` en la URL); las acciones ocasionales (subir, crear) quedan plegadas detrás de un botón y las listas largas muestran las primeras y «Ver N más». El menú del admin se agrupa con `grupo` en `NAV` (`CampusShell.tsx`).
- Celular (`design.md` › Celular): campos a 16 px en táctil (regla global), zona de toque ≥ 40 px (`py-*` + `-my-*` si el texto es chico), letra ≥ 12 px, filtros secundarios plegados y columnas secundarias ocultas en tablas. Revisar con una pasada a 360 y 390 px antes de cerrar un cambio visual.
- Dibujo continuo (canvas): fuera del hilo principal cuando se pueda (Web Worker + OffscreenCanvas, como `ui/circuito/`).

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
- **Imágenes**: `ImageField` sube a `sitio` (`subirImagen`) y guarda la URL; no pedir URLs pegadas. `imagenOpcional()` solo acepta rutas del propio sitio (`/media/…`, `/images/…`): `next/image` no tiene `remotePatterns` y una URL externa rompe la página.
- **Archivos**: `FileField` con `maxBytes` marca inválido un archivo demasiado grande al elegirlo (el servidor vuelve a validar). Subidas por server action: el tope real lo ponen `proxyClientMaxBodySize` y `serverActions.bodySizeLimit` en `next.config.js`.
- **Animación de entrada**: en el sitio público, la clase `al-entrar` (CSS atado al scroll); en el campus, `Reveal` (CSS + `IntersectionObserver`), dentro de una lista como `<Reveal as="li">`. En el sitio público no se importa `motion` (solo en el campus).
- **Etiquetas**: en los editores, el control va adentro de su `<label>` (o con `aria-label`); un `<label>` suelto sin `htmlFor` no nombra el campo.
- **Botones sueltos** (baja, deshabilitar, borrar, marcar leído, liberar): la acción tiene la forma de `ActionForm` (`(_: R, fd) => Promise<R>`) y se usa `<ActionForm action={x} submit={null} reset={false} okLabel="Hecho">` con el botón (`Confirm`/`SubmitButton`) adentro. Así el error se muestra; un `<form action>` que devuelve `void` lo traga.
- **Validación**: todo dato del formulario se revalida en el servidor (largos, rangos, UUID con `UUID`, fecha con `fechaInicioValida()`); el `required` del HTML no cuenta. Los campos del CMS con formato propio (`campoSettingInvalido` en `guardarSetting`) y las claves permitidas (`CLAVES_SETTINGS`) se listan ahí.
- **SEO**: cada página pública exporta `metadata = metaPagina({ titulo, descripcion, ruta })` (`src/lib/seo.ts`: canonical, Open Graph y Twitter propios, imagen social por defecto). Datos estructurados con `<JsonLd datos={…} />`. La URL del sitio sale siempre de `siteUrl()` (`src/lib/env.ts`).
- **Permisos de `anon`**: el visitante solo lee el CMS y las vistas públicas e inserta contacto/demanda (0028). Una tabla o vista nueva que el sitio público necesite lleva su `grant select … to anon` en la migración; sin eso el sitio no la ve. Los formularios públicos solo insertan: el builder no pide `RETURNING` salvo `.select()`.
- **RLS**: en una política, `es_admin()`, `auth_rol()` y `auth.uid()` van como `(select …)`, y lo que depende del usuario (sus ediciones, sus cursos) como `col IN (select mis_…())`; una función por fila no escala (ver 0024/0025). Una migración nueva con políticas sigue esa forma.
- **Paginación** (reglas en `src/lib/paginar.ts`, con tests): la página va en la URL (`?pagina=N`, la 1 no se escribe), un valor raro es la 1, cambiar un filtro vuelve a la 1. Listas del admin: `.range()` del builder + `<Paginacion>` (`POR_PAGINA = 25`), pidiendo una fila de más y con orden estable (usuarios, consultas, encuestas, cursos). Sitio público: `paginar()` + `<Paginas>` numerada; la página fuera de rango **redirige** a la última, y cada página tiene canónica y título propios (`/cursos` 12 por página). Las vistas filtradas de `/cursos` apuntan su canónica a `/cursos`.
- **Errores de consultas**: el builder devuelve `{ data, error }` y registra `db: <op> <tabla> falló — …` en el log del servidor; una pantalla que solo mira `data` mostraría «vacío» ante un fallo, así que ante un listado inesperadamente vacío mirar primero ese log. No volver a poner un `loading.tsx` en la raíz de `app/` (rompe el 404 real de `notFound()`).
- **Colores de estado**: `text-danger`, `text-success`, `text-warning`, `text-info` (tokens de `@theme`); no usar `red-400` ni similares. Bordes de controles: `border-outline` (3:1 mínimo), los divisores sutiles `border-outline-variant`.
- **Rangos**: `Field` acepta `min/max/step`; el servidor revalida (`guardarCurso`) y la base tiene los `check`.
- **Gráficos**: SVG propio en `components/campus/charts.tsx` (sin librerías).
- **Seed de demo**: `seed:dev`/`seed:test` crean cuentas `@demo.example.com` (contraseña `demo1234`), 5 cursos y 4 talleres cortos.

## Mails
Los mails transaccionales (invitación, recuperación de clave, cambios de clases, alta en curso) se arman en `src/lib/mail-templates.ts` (HTML responsivo con logo `public/images/logo-mail.png`, más texto plano de respaldo) y se envían con `enviarMail(to, mail)` de `src/lib/mail.ts` (SMTP por nodemailer; con Resend: `smtp.resend.com`, usuario `resend`, clave = API key). Un mail nuevo = una función nueva en `mail-templates.ts`; nunca strings sueltos en las actions.
