'use client'

import { useRef } from 'react'

// Tarjeta que se inclina en 3D hacia el puntero, con un reflejo que lo sigue y la imagen interna en paralaje
// (`.inclinable-capa`). Solo con mouse o lápiz y sin reduced-motion; en táctil queda quieta. Los estilos están en
// globals.css § 5; acá solo se escriben las variables --rx/--ry/--px/--py/--bx/--by.
export default function Inclinable({ children, className = '', grados = 7 }: { children: React.ReactNode; className?: string; grados?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const mover = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || e.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.dataset.activo = ''
    el.style.setProperty('--rx', `${(-y * grados).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * grados).toFixed(2)}deg`)
    el.style.setProperty('--px', `${(-x * 14).toFixed(1)}px`)
    el.style.setProperty('--py', `${(-y * 14).toFixed(1)}px`)
    el.style.setProperty('--bx', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--by', `${(y + 0.5) * 100}%`)
  }
  const salir = () => {
    const el = ref.current
    if (!el) return
    delete el.dataset.activo
    for (const v of ['--rx', '--ry', '--px', '--py']) el.style.removeProperty(v)
  }
  return <div ref={ref} onPointerMove={mover} onPointerLeave={salir} className={`inclinable ${className}`}>{children}</div>
}
