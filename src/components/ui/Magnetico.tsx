'use client'

import { useRef } from 'react'

// Envoltorio «magnético»: el botón se corre unos píxeles hacia el puntero cuando pasa cerca y vuelve con un resorte
// al salir. Solo mouse/lápiz y sin reduced-motion. No cambia el foco ni el área clicable del hijo.
export default function Magnetico({ children, fuerza = 0.28, className = '' }: { children: React.ReactNode; fuerza?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const mover = (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = ref.current
    if (!el || e.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    el.style.transition = 'translate 0.15s var(--ease-out)'
    el.style.translate = `${((e.clientX - r.left - r.width / 2) * fuerza).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * fuerza).toFixed(1)}px`
  }
  const salir = () => {
    const el = ref.current
    if (!el) return
    el.style.transition = 'translate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
    el.style.translate = '0 0'
  }
  return <span ref={ref} onPointerMove={mover} onPointerLeave={salir} className={`inline-flex ${className}`}>{children}</span>
}
