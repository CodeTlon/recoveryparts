import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const POR_PAGINA = 25

/** Número de página (1, 2, …) desde el parámetro `pagina` de la URL; cualquier valor raro es la página 1. */
export const paginaDe = (v: string | undefined) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1 }

/** Anterior / Siguiente conservando el resto de los parámetros de la URL. `hayMas` sale de pedir una fila de más. */
export default function Paginacion({ pagina, hayMas, params = {} }: { pagina: number; hayMas: boolean; params?: Record<string, string | undefined> }) {
  if (pagina === 1 && !hayMas) return null
  const href = (p: number) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v)
    if (p > 1) sp.set('pagina', String(p))
    const s = sp.toString()
    return s ? `?${s}` : '?'
  }
  const clase = 'btn-ghost px-3! py-2!'
  return (
    <nav aria-label="Paginación" className="mt-6 flex items-center justify-between gap-3">
      {pagina > 1 ? <Link href={href(pagina - 1)} className={clase}><ChevronLeft size={16} aria-hidden /> Anterior</Link> : <span />}
      <span className="text-sm text-on-surface-variant">Página {pagina}</span>
      {hayMas ? <Link href={href(pagina + 1)} className={clase}>Siguiente <ChevronRight size={16} aria-hidden /></Link> : <span />}
    </nav>
  )
}
