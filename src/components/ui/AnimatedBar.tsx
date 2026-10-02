'use client'

import { motion, useReducedMotion } from 'motion/react'

// Barra de progreso que se llena al entrar en pantalla. Sin movimiento muestra el valor final.
export default function AnimatedBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const reduce = useReducedMotion()
  const pct = max ? Math.min(100, (100 * value) / max) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
      <motion.div
        className={`h-2 rounded-full bg-gradient-to-r from-accent-hover to-accent ${className}`}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={reduce ? { width: `${pct}%` } : undefined}
      />
    </div>
  )
}
