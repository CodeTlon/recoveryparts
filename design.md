# Design — Recovery Parts

Sistema visual fijado el 2026-10-28 (v0.17.0). Toda pantalla nueva o rediseño parte de acá: el sitio público, el acceso y
el campus comparten este sistema. Para crecer se amplía este archivo; no se arma otro look por página.

## Identidad (lo que no se toca)
- Logo cerebro: hemisferio **circuito naranja** + hemisferio **mundo azul y verde** (`public/images/logo.png`).
- Fondo **navy oscuro**, un solo tema (sin modo claro ni toggle). Naranja = acción. Montserrat en el texto.
- Las dos áreas llevan el color de una mitad del logo: **Reparación y Tecnología → naranja** (`accent`),
  **Creación y Diseño → azul** (`signal-blue`). Mapa único: `AREA_COLOR` en `src/components/public/CursoCard.tsx`.

## Tokens (`@theme` de `src/app/globals.css`, en OKLCH)
Los nombres son los de siempre (el campus los usa en todas partes); cambiaron los valores.

| Token | Valor | Uso |
|---|---|---|
| `surface` | `oklch(0.175 0.038 263)` | fondo de página |
| `surface-container-lowest` → `-highest` | `0.145` → `0.32` de luminosidad, mismo tono | capas (cada escalón ≈ 3 puntos) |
| `on-surface` / `on-surface-variant` | `0.96` / `0.80` | texto principal / secundario |
| `outline` / `outline-variant` | `0.62` / `0.355` | borde de controles (≥ 3:1) / divisores |
| `accent` / `accent-hover` | `oklch(0.72 0.185 47)` / `oklch(0.67 0.19 43)` | botón primario, foco, área técnica |
| `signal-blue` / `signal-green` | `oklch(0.7 0.14 252)` / `oklch(0.76 0.17 148)` | área de diseño, confirmaciones; nunca decoración suelta |
| `secondary` | `oklch(0.84 0.11 62)` | textos de aviso cálidos («Próximamente nuevas fechas») |
| `danger` · `success` · `warning` · `info` | ver `globals.css` | estados (≥ 6:1 sobre `surface`) |

Neutros siempre teñidos hacia el tono 263 (nada de gris puro). Colores nuevos: se agregan como token, nunca en línea.

## Tipografía
- **Display:** Archivo variable (ejes `wght` 100–900 y `wdth` 62–125), autoalojada (`src/app/fonts/`, ver `FONTS.md`).
  Utilidad `display`: Archivo al **118 % de ancho**, peso 700, interletra −0,025em, `text-wrap: balance`.
  Títulos de tarjetas y subtítulos: `display` con `[font-stretch:105%–108%]`.
- **Texto:** Montserrat variable.
- Títulos en **caja normal** y siempre rectos (sin itálica, sin `<em>` acentuado, sin mayúsculas forzadas).
- Etiqueta chica de dato (fecha, área, «Inversión»): utilidad `dato` (Montserrat 12 px, semibold, números tabulares).

## Componentes base
- Botones (`btn-primary`, `btn-outline`, `btn-ghost`): caja normal, radio 6 px, `active:translate-y-px`, foco con anillo
  naranja instantáneo. Primario naranja relleno; secundario con borde `outline` (no naranja).
- `card`: radio 14 px, borde `outline-variant`, fondo `surface-container-low`.
- Chips / filtros: píldora; la opción activa va **invertida** (`bg-on-surface text-surface-container-lowest`). Mismo
  criterio en pestañas del campus y en la paginación.
- Paginación: `components/ui/Paginas.tsx` (numerada, sitio público) y `components/campus/Paginacion.tsx`
  (anterior/siguiente). Reglas en `src/lib/paginar.ts`.
- Encabezado de página interior: `components/ui/EncabezadoPagina.tsx`. Título de sección: `components/ui/SectionTitle.tsx`
  (pista de circuito que se dibuja con el scroll + título display).

## Celular (v0.17.1)
- Campos (`input`, `select`, `textarea`) a 16 px en pantallas táctiles: con menos, Safari de iPhone hace zoom al enfocarlos.
  Lo resuelve una regla de `globals.css` fuera de las capas de Tailwind; no hace falta tocar cada campo.
- Zona de toque de 40 px como mínimo en todo control aislado. Si el texto es chico, se agranda con `py-*` y se compensa con
  margen negativo (`-my-*`) para no mover el layout.
- Letra mínima de 12 px (`text-xs`), también en gráficos y etiquetas del campus.
- Filtros secundarios plegados detrás de un botón en el celular (ver `CursosFilters`): lo primero que se ve son los resultados.
- Tablas del campus: en el celular se ocultan las columnas secundarias (`hidden md:table-cell`) antes que hacer scroll lateral.

## Portada y pie (v0.17.2)
- La portada no pasa de ~9–10 pantallas en el celular: listas cortas (4 inicios, hasta 6 fotos de grupos de egresados en fila deslizable), destacados en fila
  deslizable debajo de `lg` y un link «Ver todos» en vez de repetir el catálogo. El cierre con datos de contacto vive en el
  pie, no se repite en la portada.
- Pie compacto (v0.17.3, a gusto de Mateo): marca chica + datos en columnas (Visitanos / Contacto / Sitio) y el copyright.
  Sin invitación grande, sin nombre gigante y sin «Volver arriba». En el celular el teléfono llama (`tel:`), el mail abre el
  correo, la dirección abre el mapa y WhatsApp abre el chat.
- Un control que parece filtro filtra ahí mismo y marca la opción elegida (`aria-pressed`); si lleva a otra página, se
  escribe como link («Ver todo en …»), no como chip.
- El circuito no compite con lo que se lee: tenue detrás del texto (`LECTURA` en `CircuitField.tsx`) y pulsos del fondo
  fijo más suaves que los del hero.

## Motivo propio: el circuito
Pistas finas a 0°/45°/90° con nodos huecos en los extremos, como el hemisferio naranja del logo. Reemplaza a la aurora, las
grillas y los brillos genéricos. Aparece en:
- `CircuitField` (canvas): fondo vivo de todo el sitio público (`modo="fondo"`, tenue, fijo) y versión intensa en el hero,
  el cierre de la portada, el 404 y el panel del login (`modo="hero"`).
- La pista de `SectionTitle` y la línea de tiempo del plan de estudios en la ficha del curso.

## Movimiento (todo se apaga con `prefers-reduced-motion`)
| Efecto | Dónde | Cómo |
|---|---|---|
| Circuito vivo: pulsos todo el tiempo, se encienden cerca del puntero, ráfaga al clic, paralaje | fondo público, hero | `CircuitField.tsx` + `circuito/motor.ts` (canvas 2D en un Web Worker, sin librerías) |
| Título que se expande de Archivo comprimido a ancho | h1 de páginas públicas, login, 404 | `TituloExpandido.tsx` + keyframes `expandir` (CSS) |
| Entrada con recorte atada al scroll | tarjetas, filas de agenda, mosaicos | clase `al-entrar` (`animation-timeline: view()`, sin JS) |
| Pista que se dibuja al entrar la sección | títulos de sección | `.pista-trazo` / `.pista-nodo` |
| Barra de progreso de lectura | bajo el menú | `.progreso-pagina` (`scroll(root)`) |
| Cifras que cuentan solas | «Nosotros» | `@property --cifra` + `counter()`; el número real queda en el HTML |
| Díptico que se ensancha hacia el puntero | áreas de la portada | `.diptico` + `:has()` |
| Tarjeta que se inclina en 3D con reflejo e imagen en paralaje | tarjetas de curso | `Inclinable.tsx` (solo mouse/lápiz) |
| Botón magnético | CTA principales | `Magnetico.tsx` (sin rebote) |
| Foto que viaja de la tarjeta a la ficha / de la grilla al visor | cursos, fotos de las aulas | `ViewTransition` de React con `share="morph"` |
| Acordeón con altura animada nativa | preguntas frecuentes | `details.acordeon` + `interpolate-size` |
| Fila deslizable con foco en la del centro | testimonios | `.fila-foco` (`view(inline)`) |

Reglas: animar `transform`/`translate`/`opacity`/`clip-path` (la excepción deliberada es el ancho tipográfico y las
columnas del díptico); easing `--ease-out`; nada de rebote en controles; nada de bajar la opacidad del contenido que todavía
no entró (rompe el contraste para lectores y auditorías); el texto animado deja una copia estática que fija el layout
(CLS 0). El fondo no tiene botón de pausa por decisión de producto (ver `.ai/context/DECISIONS.md`).

## Gráficos (v0.17.5, `src/components/campus/charts.tsx`)
- Sin librerías ni JS en el cliente: HTML/CSS del servidor. Las barras crecen al cargar (`crece-x`/`crece-y`, se apagan con
  `prefers-reduced-motion`).
- Colores: una serie = `bg-dato` (naranja contenido, L 0,66); estados de inscripción = `dato-fin` (finalizadas),
  `dato-curso` (cursando), `dato-baja` (desertores). Validados contra el navy de las tarjetas (banda de luminosidad,
  croma y ΔE ≥ 21 entre vecinos para deutan/protan). No usar `accent`/`success`/`danger` en marcas de datos.
- Marcas finas: barras de 8 px (6 px en tarjetas chicas) con pista `bg-dato/15`, columnas de 24 px como máximo con la
  esquina redondeada solo arriba y una línea de base; parte de un todo = una barra partida con 2 px de separación (no anillos).
- Los números van en color de texto y escritos al lado de la marca (nunca solo en un tooltip); cada gráfico lleva
  `role="img"` con los datos en `aria-label`. Porcentajes con coma decimal y espacio (`33,3 %`).
- Un solo filtro por página, arriba de todo (`Pestanas` con el valor en la URL).

## Cursor propio (v0.18.0, `components/ui/CursorCircuito.tsx`)
Un nodo naranja (6 px, el punto exacto) y un anillo de 30 px que lo sigue con retraso; sobre algo clicable el anillo crece
a 46 px en claro (se lee sobre los botones naranjas) y el punto se esconde; al apretar, el anillo se achica. Solo sitio
público, solo `pointer: fine` y sin `prefers-reduced-motion`; campos de texto con la barra del sistema; con
`forced-colors` vuelve el cursor del sistema. Un solo `requestAnimationFrame` que se detiene en reposo.

## Qué comparten todas las páginas
Wordmark (logo + «Recovery Parts» en display), menú flotante, pie «declaración», tokens, tipografía, botones, chips,
paginación y el fondo de circuito (solo en el sitio público). El campus usa el mismo sistema sin el fondo animado.

## Qué no hacer (huellas de «hecho por IA» que se sacaron)
Aurora/blobs difusos, foco de luz que sigue al puntero en tarjetas, texto que se desenfoca al entrar, eyebrow en
mayúsculas + palabra resaltada en itálica + barrita con degradé, cinta infinita de testimonios, lupa sobre fotos,
mayúsculas con tracking en todos los botones, degradés en el texto, cifras inventadas.
