'use client'

import { ViewTransition, startTransition, useCallback, useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useModalFocus } from '@/lib/useModalFocus'

export type Foto = { id: string; imagen_url: string; alt: string; descripcion: string | null; etiqueta?: string }

// Grilla de fotos con visor ampliado (las fotos de cada aula en /aulas y los grupos de egresados del inicio).
// `prioridad`: las primeras fotos se cargan con prioridad cuando son lo primero que se ve. `etiqueta`: un rótulo que
// se ve siempre sobre la foto (ej. el curso del grupo), con `descripcion` debajo; sin etiqueta, la descripción aparece
// al pasar el mouse. `densa`: dos columnas también en el celular (la foto ancha, también ahí).
export default function Galeria({ fotos, prioridad = true, densa = false, vacio = 'Pronto vamos a sumar fotos de la academia.' }: {
  fotos: Foto[]; prioridad?: boolean; densa?: boolean; vacio?: string
}) {
  const [idx, setIdx] = useState<number | null>(null)
  const lista = fotos

  const dialogRef = useRef<HTMLDivElement>(null)
  useModalFocus(dialogRef, idx !== null)
  const go = useCallback((d: number) => setIdx((i) => (i === null ? i : (i + d + lista.length) % lista.length)), [lista.length])
  // Abrir y cerrar dentro de una transición: la miniatura y la foto ampliada comparten nombre de ViewTransition y el
  // navegador anima una hacia la otra. Solo una de las dos lleva el nombre a la vez (los nombres tienen que ser únicos).
  const abrir = (i: number | null) => startTransition(() => setIdx(i))
  // useLayoutEffect y no useEffect: con la transición de vista React corre los efectos comunes recién cuando termina
  // la animación, y el Escape o las flechas apretados en ese segundo se perdían.
  useLayoutEffect(() => {
    if (idx === null) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') abrir(null); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', k)
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [idx, go])

  if (!fotos.length) return <p className="card p-10 text-center text-on-surface-variant">{vacio}</p>
  const actual = idx !== null ? lista[idx] : null

  return (
    <>
      {/* Casillas de proporción fija (4:3): no se guardan las medidas de cada foto y, con tamaños supuestos, la página
          saltaba al cargar cada imagen. El visor ampliado muestra la foto completa. */}
      {/* Las 3 primeras (la primera fila) se cargan con prioridad: son el LCP de la página. */}
      {/* Grilla con ritmo: cada sexta foto ocupa dos columnas (en pantallas medianas para arriba). */}
      <div className={`grid ${densa ? 'grid-cols-2' : 'grid-cols-1'} gap-3 sm:auto-rows-[220px] sm:grid-cols-2 md:gap-4 lg:auto-rows-[280px] lg:grid-cols-3`}>
        {lista.map((f, i) => {
          const img = <Image src={f.imagen_url} alt={f.alt} fill {...(i < 3 && prioridad ? { priority: true } : { loading: 'lazy' as const })} sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,400px" className="object-cover transition-[scale,filter] duration-700 ease-(--ease-out) group-hover:scale-105" />
          return (
            <button key={f.id} type="button" onClick={() => abrir(i)} className={`al-entrar group relative block aspect-4/3 w-full overflow-hidden rounded-card bg-surface-container sm:aspect-auto ${i % 6 === 0 ? (densa ? 'col-span-2' : 'sm:col-span-2') : ''}`}>
              {idx === i ? img : <ViewTransition name={`foto-${f.id}`} share="morph" default="none">{img}</ViewTransition>}
              {f.etiqueta ? (
                <span aria-hidden className="absolute inset-x-1.5 bottom-1.5 rounded-lg bg-surface-container-lowest/85 px-2.5 py-1.5 text-left backdrop-blur-md sm:inset-x-2 sm:bottom-2 sm:px-3 sm:py-2">
                  <span className="line-clamp-2 text-xs font-semibold leading-snug sm:text-sm">{f.etiqueta}</span>
                  {f.descripcion && <span className="block truncate text-xs text-on-surface-variant">{f.descripcion}</span>}
                </span>
              ) : f.descripcion && <span aria-hidden className="absolute inset-x-2 bottom-2 translate-y-2 rounded-lg bg-surface-container-lowest/85 px-3 py-2 text-left text-sm opacity-0 backdrop-blur-md transition-[opacity,translate] duration-300 ease-(--ease-out) group-hover:translate-y-0 group-hover:opacity-100">{f.descripcion}</span>}
            </button>
          )
        })}
      </div>

      {actual && (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={actual.alt} className="fixed inset-0 z-60 flex items-center justify-center bg-surface-container-lowest/95 p-4 backdrop-blur-md" onClick={() => abrir(null)}>
          <button type="button" aria-label="Cerrar" onClick={() => abrir(null)} className="absolute right-4 top-4 rounded-lg p-2 text-on-surface hover:bg-on-surface/10"><X size={28} /></button>
          <button type="button" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); go(-1) }} className="absolute left-2 rounded-lg p-2 text-on-surface hover:bg-on-surface/10 md:left-6"><ChevronLeft size={36} /></button>
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <ViewTransition name={`foto-${actual.id}`} share="morph" default="none">
              <Image src={actual.imagen_url} alt={actual.alt} width={1600} height={1200} className="max-h-[80vh] w-auto rounded-card object-contain" />
            </ViewTransition>
            {(actual.etiqueta || actual.descripcion) && <figcaption className="mt-3 text-center text-sm text-on-surface-variant">{actual.etiqueta && <span className="font-semibold text-on-surface">{actual.etiqueta}</span>}{actual.etiqueta && actual.descripcion && ' · '}{actual.descripcion}</figcaption>}
          </figure>
          <button type="button" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); go(1) }} className="absolute right-2 rounded-lg p-2 text-on-surface hover:bg-on-surface/10 md:right-6"><ChevronRight size={36} /></button>
        </div>
      )}
    </>
  )
}
