'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

// img plano en todo este archivo a propósito: son URLs cargadas por el Admin
// desde /admin/galeria, dominio arbitrario — no se pueden allowlistar de
// antemano en `images.remotePatterns` de next.config.mjs.

export type FotoGaleria = { id: number; url: string; alt: string; descripcion: string | null; categoria: string; destacada?: boolean }

export function GaleriaLightbox({ fotos }: { fotos: FotoGaleria[] }) {
  const [activa, setActiva] = useState<number | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[160px] md:auto-rows-[190px] gap-4">
        {fotos.map((f, i) => (
          <button
            key={f.id}
            onClick={() => setActiva(i)}
            className={`relative overflow-hidden rounded border border-outline-variant bg-surface group text-left ${f.destacada ? 'md:col-span-2 md:row-span-2' : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={f.alt} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            {f.descripcion && (
              <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 bg-gradient-to-t from-black/85 to-transparent">
                <div className="text-xs md:text-sm font-semibold text-white">{f.descripcion}</div>
              </div>
            )}
          </button>
        ))}
      </div>

      {activa !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setActiva(null)}>
          <button onClick={() => setActiva(null)} aria-label="Cerrar" className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={32} /></button>
          {activa > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setActiva(activa - 1) }} aria-label="Anterior" className="absolute left-4 text-white/80 hover:text-white"><ChevronLeft size={40} /></button>
          )}
          {activa < fotos.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setActiva(activa + 1) }} aria-label="Siguiente" className="absolute right-4 text-white/80 hover:text-white"><ChevronRight size={40} /></button>
          )}
          <div className="relative w-full max-w-3xl h-[70vh]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotos[activa].url} alt={fotos[activa].alt} className="absolute inset-0 w-full h-full object-contain" />
          </div>
        </div>
      )}
    </>
  )
}
