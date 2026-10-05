'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Search } from 'lucide-react'
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

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(spRef.current.toString())
    v ? p.set(k, v) : p.delete(k)
    start(() => router.replace(`${path}?${p.toString()}`, { scroll: false }))
  }

  useEffect(() => {
    const t = setTimeout(() => { if ((spRef.current.get('q') ?? '') !== q) set('q', q) }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const sel = (name: string, label: string, opts: [string, string][], todos = 'Todos') => (
    <label className="flex flex-col">
      <span className="label">{label}</span>
      <select className="input" value={sp.get(name) ?? ''} onChange={(e) => set(name, e.target.value)}>
        <option value="">{todos}</option>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )

  return (
    <div className="mt-10 space-y-4">
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o palabra clave…" aria-label="Buscar cursos" className="input !pl-11" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {sel('area', 'Área', [['diseno', 'Creación y Diseño'], ['tecnico', 'Reparación y Tecnología']])}
        {sel('tipo', 'Tipo', [['curso', 'Curso'], ['taller', 'Taller']])}
        {sel('nivel', 'Nivel', [['inicial', 'Inicial'], ['intermedio', 'Intermedio'], ['avanzado', 'Avanzado']])}
        {sel('dia', 'Día', DIAS.map((d, i) => [String(i), d]))}
        {sel('orden', 'Ordenar por', [['destacados', 'Destacados'], ['proximos', 'Próximos a iniciar'], ['precio', 'Precio']], 'Predeterminado')}
      </div>
    </div>
  )
}
