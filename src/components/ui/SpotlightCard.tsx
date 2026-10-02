'use client'

import { useRef } from 'react'

// Card con foco de luz naranja que sigue al puntero. Sin dependencias.
export default function SpotlightCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <div ref={ref} onPointerMove={onMove}
      className={`group relative overflow-hidden rounded-card border border-outline-variant bg-surface-container shadow-card transition-[box-shadow,border-color] duration-300 hover:border-accent/50 hover:shadow-card-hover ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(320px circle at var(--mx,50%) var(--my,50%), rgba(249,115,22,0.14), transparent 60%)' }} />
      <div className="relative">{children}</div>
    </div>
  )
}
