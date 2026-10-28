import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const POR_PAGINA = 25

// La regla de la página vive en lib/paginar.ts (compartida con el sitio público y testeada); se re-exporta acá para
// no cambiar los imports del campus.
export { paginaDe } from '@/lib/paginar'

/** Anterior / Siguiente conservando el resto de los parámetros de la URL. `hayMas` sale de pedir una fila de más.
 *  (Con total conocido, el sitio público usa la paginación numerada de components/ui/Paginas.tsx.) */
export default function Paginacion({ pagina, hayMas, params = {} }: { pagina: number; hayMas: boolean; params?: Record<string, string | undefined> }) {
  if (pagina === 1 && !hayMas) return null
  const href = (p: number) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v)
    if (p > 1) sp.set('pagina', String(p))
    const s = sp.toString()
    return s ? `?${s}` : '?'
  }
  const clase = 'btn-ghost h-11 px-3!'
  return (
    <nav aria-label="Paginación" className="mt-6 flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
      {pagina > 1 ? <Link href={href(pagina - 1)} className={clase} aria-label="Página anterior"><ChevronLeft size={16} aria-hidden /> Anterior</Link> : <span />}
      <span className="dato rounded-pill border border-outline-variant px-3 py-1">Página {pagina}</span>
      {hayMas ? <Link href={href(pagina + 1)} className={clase} aria-label="Página siguiente">Siguiente <ChevronRight size={16} aria-hidden /></Link> : <span />}
    </nav>
  )
}
