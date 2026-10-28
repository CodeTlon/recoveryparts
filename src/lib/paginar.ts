// Paginación de listados (sitio público y campus). Funciones puras: sin React ni Next, para poder testearlas.
// Reglas: la página vive en la URL (`?pagina=N`, la 1 no se escribe), un valor raro es la página 1, una página que
// no existe se corrige a la última (nunca se muestra una página vacía) y cambiar un filtro vuelve a la página 1.

/** Número de página desde el parámetro `pagina` de la URL; cualquier valor raro es la página 1. */
export const paginaDe = (v: string | undefined) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1 }

/** Corta una lista ya filtrada en la página pedida. `desde`/`hasta` son 1-based para el texto «Mostrando 13–19 de 19». */
export function paginar<T>(lista: T[], paginaParam: string | undefined, porPagina: number) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina))
  const pagina = Math.min(paginaDe(paginaParam), totalPaginas)
  const inicio = (pagina - 1) * porPagina
  const items = lista.slice(inicio, inicio + porPagina)
  return { pagina, totalPaginas, items, desde: items.length ? inicio + 1 : 0, hasta: inicio + items.length, total: lista.length }
}

/** URL de una página conservando los demás parámetros (sin vacíos). `ancla`: id al que salta (p. ej. los resultados). */
export function hrefPagina(ruta: string, params: Record<string, string | undefined>, p: number, ancla?: string) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v && k !== 'pagina') sp.set(k, v)
  if (p > 1) sp.set('pagina', String(p))
  const q = sp.toString()
  return `${ruta}${q ? `?${q}` : ''}${ancla ? `#${ancla}` : ''}`
}

/** Páginas a mostrar en la paginación numerada: 1 … 4 5 6 … 12 (primera, última y vecinas de la actual). */
export function paginasVisibles(actual: number, total: number): (number | '…')[] {
  const orden = [...new Set([1, total, actual - 1, actual, actual + 1])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  orden.forEach((p, i) => { if (i && p - orden[i - 1] > 1) out.push('…'); out.push(p) })
  return out
}
