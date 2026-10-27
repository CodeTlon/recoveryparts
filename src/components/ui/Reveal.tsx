'use client'

import { useEffect, useRef } from 'react'

// Entrada al hacer scroll (fade + subida), sin librería: un IntersectionObserver y una transición CSS (`.reveal` en
// globals.css). Lo que ya está en pantalla al cargar no se oculta nunca: el HTML del servidor se ve completo desde el
// primer frame (antes salía con opacity 0 hasta que hidrataba el JS, y eso demoraba el LCP). Respeta reduced-motion.
export default function Reveal({ children, delay = 0, y = 16, className = '' }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || el.getBoundingClientRect().top < innerHeight) return
    el.dataset.reveal = 'oculto'
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.dataset.reveal = 'visto'; io.disconnect() }
    }, { rootMargin: '0px 0px -60px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ '--reveal-y': `${y}px`, '--reveal-delay': `${delay}s` } as React.CSSProperties}>
      {children}
    </div>
  )
}
