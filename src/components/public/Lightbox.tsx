'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export type Foto = { id: string; imagen_url: string; alt: string; descripcion: string | null; categoria: string; area: string | null }

export default function Galeria({ fotos }: { fotos: Foto[] }) {
  const [cat, setCat] = useState('todas')
  const [idx, setIdx] = useState<number | null>(null)
  const cats = ['todas', ...Array.from(new Set(fotos.map((f) => f.categoria)))]
  const label: Record<string, string> = { todas: 'Todas', aulas: 'Aulas', clases: 'Clases en acción', trabajos: 'Trabajos de alumnos', egresados: 'Egresados', eventos: 'Eventos' }
  const lista = cat === 'todas' ? fotos : fotos.filter((f) => f.categoria === cat)

  const go = useCallback((d: number) => setIdx((i) => (i === null ? i : (i + d + lista.length) % lista.length)), [lista.length])
  useEffect(() => {
    if (idx === null) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setIdx(null); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', k)
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [idx, go])

  if (!fotos.length) return <p className="card p-10 text-center text-on-surface-variant">Pronto vamos a sumar fotos de la academia.</p>
  const actual = idx !== null ? lista[idx] : null

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
            className={`rounded border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${cat === c ? 'border-accent bg-accent text-surface' : 'border-outline-variant text-on-surface-variant hover:border-secondary hover:text-secondary'}`}>
            {label[c] ?? c}
          </button>
        ))}
      </div>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {lista.map((f, i) => (
          <button key={f.id} type="button" onClick={() => setIdx(i)} className="group relative block w-full break-inside-avoid overflow-hidden rounded border border-outline-variant">
            <Image src={f.imagen_url} alt={f.alt} width={800} height={600} loading="lazy" sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw" className="h-auto w-full transition-transform duration-500 group-hover:scale-105" />
          </button>
        ))}
      </div>

      {actual && (
        <div role="dialog" aria-modal="true" aria-label={actual.alt} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setIdx(null)}>
          <button type="button" aria-label="Cerrar" onClick={() => setIdx(null)} className="absolute right-4 top-4 rounded p-2 text-white hover:text-secondary"><X size={28} /></button>
          <button type="button" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); go(-1) }} className="absolute left-2 rounded p-2 text-white hover:text-secondary md:left-6"><ChevronLeft size={36} /></button>
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image src={actual.imagen_url} alt={actual.alt} width={1600} height={1200} className="max-h-[80vh] w-auto rounded object-contain" />
            {actual.descripcion && <figcaption className="mt-3 text-center text-sm text-white/80">{actual.descripcion}</figcaption>}
          </figure>
          <button type="button" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); go(1) }} className="absolute right-2 rounded p-2 text-white hover:text-secondary md:right-6"><ChevronRight size={36} /></button>
        </div>
      )}
    </>
  )
}
