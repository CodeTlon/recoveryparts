'use client'

import { useEffect, useRef } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'

// Número que cuenta hasta `to` al entrar en pantalla. Sin movimiento muestra el valor final.
export default function CountUp({ to, duration = 1.4, prefix = '', suffix = '', className }: {
  to: number; duration?: number; prefix?: string; suffix?: string; className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const fmt = (n: number) => `${prefix}${Math.round(n).toLocaleString('es-AR')}${suffix}`

  useEffect(() => {
    if (!inView || reduce || !ref.current) return
    const el = ref.current
    const c = animate(0, to, { duration, ease: 'easeOut', onUpdate: (v) => { el.textContent = fmt(v) } })
    return () => c.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, to, duration])

  return <span ref={ref} className={className}>{fmt(to)}</span>
}
