'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, ArrowUpRight, Zap } from 'lucide-react'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const AREA_LABEL: Record<string, string> = { tecnico: 'Técnico', diseno: 'Diseño' }
const TIPO_LABEL: Record<string, string> = { curso: 'Curso', taller: 'Taller' }

export type CursoCatalogo = {
  id: number
  slug: string
  titulo: string
  descripcion: string
  tipo: string
  area: string
  dias_semana: number[]
  hora_inicio: string
  hora_fin: string
  precio: number
  precio_descuento: number | null
  imagenes: string[]
  cupoTotal: number
  inscriptos: number
}

const fmtPrecio = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function CursosCatalogo({ cursos }: { cursos: CursoCatalogo[] }) {
  const [q, setQ] = useState('')
  const [area, setArea] = useState('')
  const [tipo, setTipo] = useState('')
  const [orden, setOrden] = useState<'destacados' | 'precio'>('destacados')

  const filtrados = useMemo(() => {
    let r = cursos.filter((c) => {
      const texto = `${c.titulo} ${c.descripcion}`.toLowerCase()
      return (!q || texto.includes(q.toLowerCase())) && (!area || c.area === area) && (!tipo || c.tipo === tipo)
    })
    if (orden === 'precio') r = [...r].sort((a, b) => (a.precio_descuento ?? a.precio) - (b.precio_descuento ?? b.precio))
    return r
  }, [cursos, q, area, tipo, orden])

  return (
    <>
      <div className="flex flex-col md:flex-row gap-3 mb-10">
        <label className="flex-1 flex items-center gap-3 px-4 py-3 border border-outline-variant rounded bg-surface-container-low focus-within:border-accent transition-colors">
          <Search size={18} className="text-on-surface-variant" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o palabra clave" className="bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline" />
        </label>
        <select value={area} onChange={(e) => setArea(e.target.value)} className="px-4 py-3 border border-outline-variant rounded bg-surface-container-low text-sm text-on-surface">
          <option value="">Todas las áreas</option>
          <option value="tecnico">Técnico</option>
          <option value="diseno">Diseño</option>
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="px-4 py-3 border border-outline-variant rounded bg-surface-container-low text-sm text-on-surface">
          <option value="">Cursos y talleres</option>
          <option value="curso">Solo cursos</option>
          <option value="taller">Solo talleres</option>
        </select>
        <select value={orden} onChange={(e) => setOrden(e.target.value as 'destacados' | 'precio')} className="px-4 py-3 border border-outline-variant rounded bg-surface-container-low text-sm text-on-surface">
          <option value="destacados">Destacados</option>
          <option value="precio">Menor precio</option>
        </select>
      </div>

      {!filtrados.length && (
        <div className="text-center py-20 border border-outline-variant rounded-lg bg-surface-container-low">
          <p className="text-on-surface-variant mb-4">No encontramos cursos con esa búsqueda.</p>
          <a href="https://wa.me/?text=Hola,%20busco%20un%20curso%20que%20no%20encontr%C3%A9%20en%20el%20sitio" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary transition-colors font-semibold text-sm">
            Contanos qué buscás por WhatsApp →
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtrados.map((c) => {
          const disponibles = c.cupoTotal - c.inscriptos
          const precio = c.precio_descuento ?? c.precio
          return (
            <Link key={c.id} href={`/cursos/${c.slug}`} className="group bg-surface-container-low border border-outline-variant rounded overflow-hidden transition-all duration-300 hover:border-secondary flex flex-col">
              <div className="h-48 border-b border-outline-variant bg-surface relative overflow-hidden">
                {/* img plano a propósito: URL arbitraria cargada por el Admin, no un dominio fijo para remotePatterns de next/image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.imagenes[0] && <img src={c.imagenes[0]} alt={c.titulo} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                <span className="absolute top-3 left-3 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider bg-surface-container-lowest/90 text-on-surface border border-outline-variant">
                  {TIPO_LABEL[c.tipo]} · {AREA_LABEL[c.area]}
                </span>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-semibold text-on-surface mb-2">{c.titulo}</h3>
                <p className="text-on-surface-variant mb-4 flex-grow text-sm line-clamp-2">{c.descripcion}</p>
                <p className="text-xs text-on-surface-variant mb-4">{c.dias_semana.map((d) => DIAS[d]).join('/')} {c.hora_inicio.slice(0, 5)}–{c.hora_fin.slice(0, 5)}</p>
                <div className="pt-4 border-t border-outline-variant flex justify-between items-center mt-auto">
                  <div>
                    <span className="block text-lg font-bold text-on-surface">{fmtPrecio(precio)}</span>
                    {disponibles > 0 && disponibles <= 3 && (
                      <span className="text-xs font-semibold text-accent flex items-center gap-1"><Zap size={12} /> ¡Quedan {disponibles} lugares!</span>
                    )}
                    {disponibles <= 0 && <span className="text-xs font-semibold text-on-surface-variant">Sin cupos</span>}
                  </div>
                  <ArrowUpRight size={20} className="text-secondary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
