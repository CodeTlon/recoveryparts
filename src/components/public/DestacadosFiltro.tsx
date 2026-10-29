'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export type FiltroDestacados = { clave: string; label: string; corto: string; href: string; ids: string[] }

// «Capacitaciones destacadas» de la portada: el filtro cambia las tarjetas ahí mismo (antes eran links al catálogo que
// parecían filtros y no marcaban nada). Las tarjetas las arma el servidor; acá solo se elige cuáles se ven. En el
// celular van en una fila deslizable; en escritorio se ven las 3 primeras. «Ver todos» lleva al catálogo con el
// mismo filtro.
export default function DestacadosFiltro({ titulo, filtros, tarjetas }: {
  titulo: ReactNode; filtros: FiltroDestacados[]; tarjetas: Record<string, ReactNode>
}) {
  const [clave, setClave] = useState(filtros[0].clave)
  const actual = filtros.find((f) => f.clave === clave) ?? filtros[0]

  return (
    <>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        {titulo}
        {filtros.length > 1 && (
          <div role="group" aria-label="Filtrar capacitaciones" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border md:shrink-0 border-outline-variant bg-surface-container-lowest/70 p-1">
            {filtros.map((f) => {
              const on = f.clave === actual.clave
              return (
                <button key={f.clave} type="button" aria-pressed={on} onClick={() => setClave(f.clave)}
                  className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors sm:px-4 ${on ? 'bg-on-surface text-surface-container-lowest' : 'text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface'}`}>
                  <span className="sm:hidden">{f.corto}</span><span className="hidden sm:inline">{f.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <ul aria-label={`Capacitaciones: ${actual.label}`} className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 md:mt-12 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
        {actual.ids.map((id, i) => (
          <li key={id} className={`w-[min(82vw,22rem)] shrink-0 snap-start lg:w-auto ${i > 2 ? 'lg:hidden' : ''}`}>{tarjetas[id]}</li>
        ))}
      </ul>
      <Link href={actual.href} className="btn-outline mt-8 lg:mt-10">
        {actual.clave === 'todos' ? 'Ver todos los cursos' : `Ver todo en ${actual.label}`} <ArrowRight size={16} aria-hidden />
      </Link>
    </>
  )
}
