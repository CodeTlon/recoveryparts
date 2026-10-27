'use client'

import { useEffect, useRef } from 'react'

// Número que cuenta hasta `to` al entrar en pantalla (requestAnimationFrame, sin librería). El HTML del servidor ya
// trae el valor final: sin JS o con reduced-motion se ve ese número directamente.
export default function CountUp({ to, duration = 1.4, prefix = '', suffix = '', className }: {
  to: number; duration?: number; prefix?: string; suffix?: string; className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const fmt = (n: number) => `${prefix}${Math.round(n).toLocaleString('es-AR')}${suffix}`

  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const paso = (t: number) => {
        const p = Math.min(1, (t - t0) / (duration * 1000))
        el.textContent = fmt(to * (1 - (1 - p) ** 3)) // ease-out cúbico
        if (p < 1) frame = requestAnimationFrame(paso)
      }
      frame = requestAnimationFrame(paso)
    })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(frame) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration])

  return <span ref={ref} className={className}>{fmt(to)}</span>
}
