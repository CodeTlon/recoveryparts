'use client'

// ============================================================
// DEMO — Catálogo de cursos (Recovery Parts)
// Grid de cursos con buscador + filtro por categoría. Data
// estática (mock); el filtro corre client-side sobre el array.
// Estilo Industrial Technical Narrative, flyers reales.
// ============================================================

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Clock, ArrowUpRight, SlidersHorizontal } from 'lucide-react'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'

const CURSOS = [
  { title: 'Reparación de iPhone',        cat: 'Reparación',        img: '/images/curso-iphone.jpg',       meta: '12 clases · 2 hs', price: '$25.000 + 3×$65.000' },
  { title: 'Reparación de Computadoras',  cat: 'Reparación',        img: '/images/curso-computadoras.jpg', meta: '16 clases · 2 hs', price: '$25.000 + 3×$65.000' },
  { title: 'Reparación de Notebooks',     cat: 'Reparación',        img: '/images/curso-notebooks.jpg',    meta: '12 clases · 2 hs', price: '$25.000 + 3×$65.000' },
  { title: 'Cambio de Glass',             cat: 'Reparación',        img: '/images/curso-glass.jpg',        meta: '2 clases intensivas', price: '$25.000 + 3×$65.000' },
  { title: 'Carteles Neón LED',           cat: 'Oficios Creativos', img: '/images/curso-neon.jpg',         meta: 'Taller práctico', price: '$25.000 + 3×$65.000' },
  { title: 'Estampado y Sublimación',     cat: 'Oficios Creativos', img: '/images/curso-estampados.jpg',   meta: 'Taller práctico', price: '$25.000 + 3×$65.000' },
]

const CATS = ['Todos', 'Reparación', 'Oficios Creativos']

const gridBg: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, rgba(143,144,151,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(143,144,151,0.05) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
}

export default function CursosPage() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Todos')

  const cursos = CURSOS.filter(
    (c) => (cat === 'Todos' || c.cat === cat) && c.title.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-grow pt-20">
        {/* Header */}
        <section className="border-b border-outline-variant" style={gridBg}>
          <div className="max-w-[1280px] mx-auto px-4 md:px-12 py-16">
            <div className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-low px-3 py-1 rounded mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-on-surface-variant uppercase tracking-widest">Catálogo 2026</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-on-surface mb-4 tracking-tight">Catálogo de Cursos</h1>
            <p className="text-lg text-on-surface-variant max-w-2xl">Capacitaciones 100% prácticas en reparación técnica y oficios creativos. Grupos reducidos, equipos reales.</p>

            {/* Buscador + filtros */}
            <div className="mt-10 flex flex-col lg:flex-row gap-4 lg:items-center">
              <div className="relative flex-grow max-w-md">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar curso…"
                  className="w-full bg-surface-container-low border border-outline-variant rounded pl-11 pr-4 py-3 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-secondary transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal size={16} className="text-on-surface-variant hidden md:block" />
                {CATS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`px-4 py-2 rounded text-sm font-semibold uppercase tracking-wide border transition-colors ${
                      cat === c
                        ? 'bg-accent text-white border-accent'
                        : 'border-outline-variant text-on-surface-variant hover:border-secondary hover:text-secondary'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="max-w-[1280px] mx-auto px-4 md:px-12 py-14">
          <p className="text-sm text-on-surface-variant uppercase tracking-widest mb-6">
            {cursos.length} curso{cursos.length === 1 ? '' : 's'} disponible{cursos.length === 1 ? '' : 's'}
          </p>

          {cursos.length === 0 ? (
            <div className="border border-outline-variant rounded p-16 text-center text-on-surface-variant" style={gridBg}>
              No encontramos cursos con esos filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursos.map((c) => (
                <Link
                  key={c.title}
                  href="/curso"
                  className="group bg-surface-container-low border border-outline-variant rounded overflow-hidden transition-all duration-300 hover:border-secondary flex flex-col"
                >
                  <div className="relative aspect-[4/5] border-b border-outline-variant overflow-hidden">
                    <Image
                      src={c.img}
                      alt={c.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 bg-surface/90 backdrop-blur border border-outline-variant px-2 py-1 rounded text-xs font-semibold text-accent uppercase tracking-wide">
                      {c.cat}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-lg font-semibold text-on-surface mb-2">{c.title}</h3>
                    <div className="flex items-center gap-2 text-on-surface-variant text-sm mb-5">
                      <Clock size={15} /> {c.meta}
                    </div>
                    <div className="mt-auto pt-4 border-t border-outline-variant flex items-center justify-between">
                      <span className="text-sm font-bold text-on-surface">{c.price}</span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-secondary uppercase tracking-wide">
                        Ver curso <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
