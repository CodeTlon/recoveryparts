'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { DIAS } from '@/lib/types'

// Los filtros viven en la URL (sin datos personales).
export default function CursosFilters() {
  const router = useRouter()
  const path = usePathname()
  const sp = useSearchParams()
  const [, start] = useTransition()
  const [q, setQ] = useState(sp.get('q') ?? '')
  // El debounce tiene que partir de la URL de ESE momento: con el `sp` del render viejo pisaba filtros elegidos en los 300 ms.
  const spRef = useRef(sp)
  spRef.current = sp
  // En el celular, nivel/día/orden van plegados detrás de «Más filtros» para que los cursos se vean sin bajar una
  // pantalla entera. Arrancan abiertos si alguno ya está elegido. En tablet y escritorio se ven siempre.
  const extras = ['nivel', 'dia', 'orden'].filter((k) => sp.get(k)).length
  const [masFiltros, setMasFiltros] = useState(extras > 0)

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(spRef.current.toString())
    v ? p.set(k, v) : p.delete(k)
    p.delete('pagina') // otro filtro, otra lista: se vuelve a la primera página
    start(() => router.replace(`${path}?${p.toString()}`, { scroll: false }))
  }

  useEffect(() => {
    const t = setTimeout(() => { if ((spRef.current.get('q') ?? '') !== q) set('q', q) }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const sel = (name: string, label: string, opts: [string, string][], todos = 'Todos', ancho = '') => (
    <label className={`flex min-w-0 flex-col ${ancho}`}>
      <span className="label">{label}</span>
      <select className="input py-2.5!" value={sp.get(name) ?? ''} onChange={(e) => set(name, e.target.value)}>
        <option value="">{todos}</option>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )

  // Área y tipo: grupos de botones de un toque (aria-pressed). La opción activa se marca con el color de la marca.
  const chips = (name: string, label: string, opts: [string, string][]) => (
    <div role="group" aria-label={label} className="flex max-w-full flex-wrap gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest/70 p-1 backdrop-blur-sm">
      {[['', 'Todos'] as [string, string], ...opts].map(([v, l]) => {
        const on = (sp.get(name) ?? '') === v
        return (
          <button key={v || 'todos'} type="button" aria-pressed={on} onClick={() => set(name, v)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${on ? 'bg-on-surface text-surface-container-lowest' : 'text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface'}`}>
            {l}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="relative w-full max-w-xl">
        <Search size={18} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o palabra clave…" aria-label="Buscar cursos" className="input pl-11!" />
      </div>
      <div className="flex flex-wrap gap-3">
        {chips('area', 'Área', [['tecnico', 'Reparación y Tecnología'], ['diseno', 'Creación y Diseño']])}
        {chips('tipo', 'Tipo', [['curso', 'Cursos'], ['taller', 'Talleres']])}
        <button type="button" aria-expanded={masFiltros} aria-controls="filtros-extra" onClick={() => setMasFiltros((v) => !v)} className="btn-outline px-4! py-2.5! md:hidden">
          <SlidersHorizontal size={16} aria-hidden /> {masFiltros ? 'Menos filtros' : 'Más filtros'}{extras > 0 && ` (${extras})`}
        </button>
      </div>
      <div id="filtros-extra" className={`${masFiltros ? 'grid' : 'hidden'} grid-cols-2 gap-3 md:grid md:grid-cols-3 lg:max-w-3xl`}>
        {sel('nivel', 'Nivel', [['inicial', 'Inicial'], ['intermedio', 'Intermedio'], ['avanzado', 'Avanzado']])}
        {sel('dia', 'Día', DIAS.map((d, i) => [String(i), d]))}
        {sel('orden', 'Ordenar por', [['destacados', 'Destacados'], ['proximos', 'Próximos a iniciar'], ['precio', 'Precio']], 'Predeterminado', 'col-span-2 md:col-span-1')}
      </div>
    </div>
  )
}
