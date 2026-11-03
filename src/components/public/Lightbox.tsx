'use client'

import { ViewTransition, startTransition, useCallback, useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { estiloFoco, sinFoco } from '@/lib/foco'
import { X, ChevronLeft, ChevronRight, GraduationCap, Loader2 } from 'lucide-react'
import { useModalFocus } from '@/lib/useModalFocus'

export type Foto = { id: string; imagen_url: string | null; alt: string; descripcion: string | null; etiqueta?: string; tam?: Tam }
/** Lugar que ocupa la foto en la grilla, elegido en el admin (0034): columnas × filas en el celular y en la compu. */
export type Tam = { cols_movil: number; filas_movil: number; cols: number; filas: number }

// Clases escritas enteras: Tailwind no ve clases armadas con ${}.
const COLS_MOVIL: Record<number, string> = { 2: 'col-span-2' }
const FILAS_MOVIL: Record<number, string> = { 2: 'row-span-2' }
const COLS: Record<number, string> = { 1: 'lg:col-span-1', 2: 'lg:col-span-2', 3: 'lg:col-span-3' }
const FILAS: Record<number, string> = { 1: 'lg:row-span-1', 2: 'lg:row-span-2' }
const claseTam = (t: Tam) => [COLS_MOVIL[t.cols_movil], FILAS_MOVIL[t.filas_movil], COLS[t.cols], FILAS[t.filas]].filter(Boolean).join(' ')

// Grilla de fotos con visor ampliado (las fotos de cada aula en /aulas y los grupos de egresados del inicio).
// `prioridad`: las primeras fotos se cargan con prioridad cuando son lo primero que se ve. `etiqueta`: un rótulo que
// se ve siempre sobre la foto (ej. el curso del grupo), con `descripcion` debajo; sin etiqueta, la descripción aparece
// al pasar el mouse. `densa`: dos columnas también en el celular (la foto ancha, también ahí). Un elemento sin
// `imagen_url` queda como tarjeta vacía con su rótulo: arma la grilla igual y no se abre en el visor.
// Con `tam` (egresados) cada foto ocupa las columnas y filas elegidas en el admin y la grilla rellena los huecos;
// sin `tam` (aulas) cada sexta foto va ancha. Las miniaturas respetan el encuadre del admin; el visor muestra la foto entera.
export default function Galeria({ fotos, prioridad = true, densa = false, vacio = 'Pronto vamos a sumar fotos de la academia.' }: {
  fotos: Foto[]; prioridad?: boolean; densa?: boolean; vacio?: string
}) {
  const [idx, setIdx] = useState<number | null>(null)
  const [cargada, setCargada] = useState<string | null>(null) // la foto ampliada ya llegó (hasta entonces, un indicador)
  const conTam = fotos.some((f) => f.tam)
  const lista = fotos.filter((f): f is Foto & { imagen_url: string } => !!f.imagen_url) // las que se ven en el visor

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
      <div className={`grid ${densa ? 'grid-cols-2' : 'grid-cols-1'} gap-3 sm:auto-rows-[220px] sm:grid-cols-2 md:gap-4 lg:auto-rows-[280px] lg:grid-cols-3 ${conTam ? 'grid-flow-row-dense auto-rows-[130px]' : ''}`}>
        {fotos.map((f, pos) => {
          const ancha = f.tam ? claseTam(f.tam) : pos % 6 === 0 ? (densa ? 'col-span-2' : 'sm:col-span-2') : ''
          const caja = `al-entrar group relative block w-full overflow-hidden rounded-card bg-surface-container sm:aspect-auto ${conTam ? '' : 'aspect-4/3'} ${ancha}`
          const rotulo = f.etiqueta && (
            <span aria-hidden className="absolute inset-x-1.5 bottom-1.5 rounded-lg bg-surface-container-lowest/85 px-2.5 py-1.5 text-left backdrop-blur-md sm:inset-x-2 sm:bottom-2 sm:px-3 sm:py-2">
              <span className="line-clamp-2 text-xs font-semibold leading-snug sm:text-sm">{f.etiqueta}</span>
              {f.descripcion && <span className="block truncate text-xs text-on-surface-variant">{f.descripcion}</span>}
            </span>
          )
          if (!f.imagen_url) return (
            <div key={f.id} className={`${caja} flex! flex-col border border-dashed border-outline-variant/70 bg-surface-container/50 p-1.5 sm:p-2`}>
              <span aria-hidden className="grid flex-1 place-items-center text-on-surface-variant/40"><GraduationCap size={32} strokeWidth={1.25} /></span>
              {f.etiqueta && (
                <span className="rounded-lg bg-surface-container-lowest/85 px-2.5 py-1.5 sm:px-3 sm:py-2">
                  <span className="line-clamp-3 text-xs font-semibold leading-snug sm:text-sm">{f.etiqueta}</span>
                  {f.descripcion && <span className="block truncate text-xs text-on-surface-variant">{f.descripcion}</span>}
                </span>
              )}
            </div>
          )
          const i = lista.findIndex((x) => x.id === f.id)
          const img = <Image src={sinFoco(f.imagen_url)} style={estiloFoco(f.imagen_url)} alt={f.alt} fill {...(pos < 3 && prioridad ? { priority: true } : { loading: 'lazy' as const })} sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,400px" className="object-cover transition-[scale,filter] duration-700 ease-(--ease-out) group-hover:scale-105" />
          return (
            <button key={f.id} type="button" onClick={() => abrir(i)} className={caja}>
              {idx === i ? img : <ViewTransition name={`foto-${f.id}`} share="morph" default="none">{img}</ViewTransition>}
              {rotulo || (f.descripcion && <span aria-hidden className="absolute inset-x-2 bottom-2 translate-y-2 rounded-lg bg-surface-container-lowest/85 px-3 py-2 text-left text-sm opacity-0 backdrop-blur-md transition-[opacity,translate] duration-300 ease-(--ease-out) group-hover:translate-y-0 group-hover:opacity-100">{f.descripcion}</span>)}
            </button>
          )
        })}
      </div>

      {actual && (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={actual.alt} className="fixed inset-0 z-60 flex items-center justify-center bg-surface-container-lowest/95 p-4 backdrop-blur-md" onClick={() => abrir(null)}>
          <button type="button" aria-label="Cerrar" onClick={() => abrir(null)} className="absolute right-4 top-4 rounded-lg p-2 text-on-surface hover:bg-on-surface/10"><X size={28} /></button>
          <button type="button" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); go(-1) }} className="absolute left-2 rounded-lg p-2 text-on-surface hover:bg-on-surface/10 md:left-6"><ChevronLeft size={36} /></button>
          {/* Hasta que llega la foto ampliada la caja no tiene alto: sin el indicador se veía solo el rótulo. */}
          {cargada !== actual.id && <Loader2 aria-hidden size={32} className="absolute animate-spin text-on-surface-variant" />}
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <ViewTransition name={`foto-${actual.id}`} share="morph" default="none">
              <Image key={actual.id} src={sinFoco(actual.imagen_url)} alt={actual.alt} width={1600} height={1200} loading="eager" sizes="(max-width:1024px) 100vw, 1024px" onLoad={() => setCargada(actual.id)}
                className={`max-h-[80vh] w-auto rounded-card object-contain transition-opacity duration-300 ${cargada === actual.id ? 'opacity-100' : 'opacity-0'}`} />
            </ViewTransition>
            {(actual.etiqueta || actual.descripcion) && <figcaption className="mt-3 text-center text-sm text-on-surface-variant">{actual.etiqueta && <span className="font-semibold text-on-surface">{actual.etiqueta}</span>}{actual.etiqueta && actual.descripcion && ' · '}{actual.descripcion}</figcaption>}
          </figure>
          <button type="button" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); go(1) }} className="absolute right-2 rounded-lg p-2 text-on-surface hover:bg-on-surface/10 md:right-6"><ChevronRight size={36} /></button>
        </div>
      )}
    </>
  )
}
