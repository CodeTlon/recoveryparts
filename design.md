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

## Motivo propio: el circuito
Pistas finas a 0°/45°/90° con nodos huecos en los extremos, como el hemisferio naranja del logo. Reemplaza a la aurora, las
grillas y los brillos genéricos. Aparece en:
- `CircuitField` (canvas): fondo vivo de todo el sitio público (`modo="fondo"`, tenue, fijo) y versión intensa en el hero,
  el cierre de la portada, el 404 y el panel del login (`modo="hero"`).
- La pista de `SectionTitle` y la línea de tiempo del plan de estudios en la ficha del curso.

## Movimiento (todo se apaga con `prefers-reduced-motion`)
| Efecto | Dónde | Cómo |
|---|---|---|
| Circuito vivo: pulsos todo el tiempo, se encienden cerca del puntero, ráfaga al clic, paralaje | fondo público, hero | `CircuitField.tsx` (canvas 2D, sin librerías) |
| Título que se expande de Archivo comprimido a ancho | h1 de páginas públicas, login, 404 | `TituloExpandido.tsx` + keyframes `expandir` (CSS) |
| Entrada con recorte atada al scroll | tarjetas, filas de agenda, mosaicos | clase `al-entrar` (`animation-timeline: view()`, sin JS) |
| Pista que se dibuja al entrar la sección | títulos de sección | `.pista-trazo` / `.pista-nodo` |
| Barra de progreso de lectura | bajo el menú | `.progreso-pagina` (`scroll(root)`) |
| Cifras que cuentan solas | «Nosotros» | `@property --cifra` + `counter()`; el número real queda en el HTML |
| Díptico que se ensancha hacia el puntero | áreas de la portada | `.diptico` + `:has()` |
| Tarjeta que se inclina en 3D con reflejo e imagen en paralaje | tarjetas de curso | `Inclinable.tsx` (solo mouse/lápiz) |
| Botón magnético | CTA principales | `Magnetico.tsx` (sin rebote) |
| Foto que viaja de la tarjeta a la ficha / de la grilla al visor | cursos, galería | `ViewTransition` de React con `share="morph"` |
| Acordeón con altura animada nativa | preguntas frecuentes | `details.acordeon` + `interpolate-size` |
| Fila deslizable con foco en la del centro | testimonios | `.fila-foco` (`view(inline)`) |

Reglas: animar `transform`/`translate`/`opacity`/`clip-path` (la excepción deliberada es el ancho tipográfico y las
columnas del díptico); easing `--ease-out`; nada de rebote en controles; nada de bajar la opacidad del contenido que todavía
no entró (rompe el contraste para lectores y auditorías); el texto animado deja una copia estática que fija el layout
(CLS 0). El fondo no tiene botón de pausa por decisión de producto (ver `.ai/context/DECISIONS.md`).

## Qué comparten todas las páginas
Wordmark (logo + «Recovery Parts» en display), menú flotante, pie «declaración», tokens, tipografía, botones, chips,
paginación y el fondo de circuito (solo en el sitio público). El campus usa el mismo sistema sin el fondo animado.

## Qué no hacer (huellas de «hecho por IA» que se sacaron)
Aurora/blobs difusos, foco de luz que sigue al puntero en tarjetas, texto que se desenfoca al entrar, eyebrow en
mayúsculas + palabra resaltada en itálica + barrita con degradé, cinta infinita de testimonios, lupa sobre fotos,
mayúsculas con tracking en todos los botones, degradés en el texto, cifras inventadas.
