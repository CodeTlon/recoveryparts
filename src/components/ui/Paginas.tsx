import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { paginasVisibles } from '@/lib/paginar'

// Paginación numerada del sitio público: Anterior · 1 … 4 5 6 … 12 · Siguiente. Son links (la página vive en la URL:
// se comparte, funciona Atrás y anda sin JS); la actual lleva aria-current. Con una sola página no muestra nada.
// `resumen`: «Mostrando 13–19 de 19», leído también por lectores de pantalla.
export default function Paginas({ actual, total, href, etiqueta = 'Paginación', resumen }: {
  actual: number; total: number; href: (p: number) => string; etiqueta?: string; resumen?: string
}) {
  if (total <= 1) return null
  const base = 'inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-semibold tabular-nums transition-colors'
  const normal = `${base} border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface`
  const item = (p: number, contenido: React.ReactNode, label: string, extra = '') => {
    const actualEs = p === actual && !extra
    const cls = actualEs ? `${base} border-on-surface bg-on-surface text-surface-container-lowest` : `${normal} ${extra}`
    const props = { 'aria-label': label, 'aria-current': actualEs ? ('page' as const) : undefined, className: cls }
    return <Link href={href(p)} rel={p === actual - 1 ? 'prev' : p === actual + 1 ? 'next' : undefined} {...props}>{contenido}</Link>
  }
  return (
    <nav aria-label={etiqueta} className="mt-12 flex flex-col items-center gap-4">
      {resumen && <p className="text-sm text-on-surface-variant">{resumen}</p>}
      <div className="flex flex-wrap items-center justify-center gap-2">
      {actual > 1 && item(actual - 1, <><ChevronLeft size={16} aria-hidden /><span className="hidden sm:inline">Anterior</span></>, 'Página anterior', 'px-3')}
      <ul className="flex flex-wrap items-center gap-2">
        {paginasVisibles(actual, total).map((p, i) => (
          <li key={i}>{p === '…' ? <span aria-hidden className="px-1 text-on-surface-variant">…</span> : item(p, p, `Página ${p}`)}</li>
        ))}
      </ul>
      {actual < total && item(actual + 1, <><span className="hidden sm:inline">Siguiente</span><ChevronRight size={16} aria-hidden /></>, 'Página siguiente', 'px-3')}
      </div>
    </nav>
  )
}
