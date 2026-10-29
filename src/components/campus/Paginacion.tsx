import { redirect } from 'next/navigation'
import Paginas from '@/components/ui/Paginas'

// Tamaño de página de las listas del campus (cursos, usuarios, consultas). Las encuestas usan uno propio, más chico.
export const POR_PAGINA = 15

// La regla de la página vive en lib/paginar.ts (compartida con el sitio público y testeada); se re-exporta acá para
// no cambiar los imports del campus.
export { paginaDe } from '@/lib/paginar'

// Rango de filas de la página para `.range()` (inclusivo, como en SQL con offset/limit).
export const rango = (pagina: number, porPagina = POR_PAGINA) => [(pagina - 1) * porPagina, pagina * porPagina - 1] as const

/** Paginación numerada del campus (la misma del sitio público): «Mostrando 16–30 de 42», Anterior · 1 2 3 · Siguiente.
 *  `total` sale de la consulta con `{ count: 'exact' }`. Conserva el resto de los parámetros de la URL (filtros,
 *  búsqueda) y la página vive en `?pagina=` (se comparte y funciona Atrás). Con una sola página no muestra nada. */
const hrefDe = (params: Record<string, string | undefined>) => (p: number) => {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v)
  if (p > 1) sp.set('pagina', String(p))
  const s = sp.toString()
  return s ? `?${s}` : '?'
}

// Una página que no existe (?pagina=9 con 2 páginas, o después de borrar filas) redirige a la última válida en vez de
// mostrar una lista vacía. Llamarla con el total, antes de renderizar la lista.
export function corregirPagina(pagina: number, total: number, params: Record<string, string | undefined> = {}, porPagina = POR_PAGINA) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (pagina > paginas) redirect(hrefDe(params)(paginas))
}

export default function Paginacion({ pagina, total, porPagina = POR_PAGINA, params = {}, que = 'resultados' }: {
  pagina: number; total: number; porPagina?: number; params?: Record<string, string | undefined>; que?: string
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const href = hrefDe(params)
  const desde = Math.min(total, (pagina - 1) * porPagina + 1), hasta = Math.min(total, pagina * porPagina)
  return <Paginas actual={Math.min(pagina, paginas)} total={paginas} href={href} etiqueta={`Páginas de ${que}`} resumen={`Mostrando ${desde}–${hasta} de ${total} ${que}`} />
}
