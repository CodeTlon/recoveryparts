'use client'

import { motion, useReducedMotion } from 'motion/react'

// Entrada al hacer scroll (fade + subida). Respeta prefers-reduced-motion.
export default function Reveal({ children, delay = 0, y = 16, className }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
