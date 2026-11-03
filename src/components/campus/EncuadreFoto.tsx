'use client'

import { useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { conFoco, estiloFoco, leerFoco, sinFoco } from '@/lib/foco'

// Elegir qué parte de la foto queda a la vista y cuánto se acerca (adaptado de FocalPicker de GC2 Entrenamiento).
// Tocar o arrastrar sobre la vista previa mueve el punto; el control de zoom recorta más cerca de ese punto.
// El resultado viaja en la URL (`#foco=x,y,zoom`, ver lib/foco.ts). También anda con teclado (flechas).
export function EncuadreFoto({ url, onChange, aspecto = '4 / 3' }: { url: string; onChange: (u: string) => void; aspecto?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const { x, y, zoom } = leerFoco(url)

  function mover(cx: number, cy: number) {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    onChange(conFoco(url, { x: ((cx - r.left) / r.width) * 100, y: ((cy - r.top) / r.height) * 100, zoom }))
  }
  function teclado(e: React.KeyboardEvent) {
    const d = e.shiftKey ? 10 : 2
    const p = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key]
    if (!p) return
    e.preventDefault()
    onChange(conFoco(url, { x: x + p[0], y: y + p[1], zoom }))
  }

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-lg border border-outline-variant bg-surface-container/50 p-3">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Punto de la foto que queda a la vista"
        aria-valuenow={Math.round(x)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${Math.round(x)}% horizontal, ${Math.round(y)}% vertical`}
        onKeyDown={teclado}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setArrastrando(true); mover(e.clientX, e.clientY) }}
        onPointerMove={(e) => { if (arrastrando) mover(e.clientX, e.clientY) }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); setArrastrando(false) }}
        onPointerCancel={() => setArrastrando(false)}
        className="relative w-full max-w-64 shrink-0 cursor-crosshair touch-none select-none overflow-hidden rounded-md border border-outline-variant bg-surface-container-high"
        style={{ aspectRatio: aspecto }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de una foto recién subida, sin optimizar */}
        <img src={sinFoco(url)} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover" style={estiloFoco(url) ?? { objectPosition: '50% 50%' }} />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-accent/40" style={{ left: `${x}%` }} />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 h-px bg-accent/40" style={{ top: `${y}%` }} />
        <span aria-hidden className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-container-lowest bg-accent shadow-card" style={{ left: `${x}%`, top: `${y}%` }} />
      </div>
      <div className="min-w-48 flex-1 space-y-3">
        <label className="block">
          <span className="label">Zoom ({zoom.toFixed(1).replace('.', ',')}×)</span>
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => onChange(conFoco(url, { x, y, zoom: Number(e.target.value) }))} className="w-full accent-accent" />
        </label>
        <p className="text-xs leading-snug text-on-surface-variant">
          <strong className="text-on-surface">Tocá o arrastrá</strong> sobre la foto para elegir qué parte queda a la vista. Subí el zoom para acercarte a ese punto.
        </p>
        <button type="button" onClick={() => onChange(sinFoco(url))} className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface">
          <RotateCcw size={12} aria-hidden /> Centrar sin zoom
        </button>
      </div>
    </div>
  )
}
