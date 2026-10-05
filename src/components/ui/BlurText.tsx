'use client'

import { motion, useReducedMotion } from 'motion/react'

// Adaptado de react-bits/BlurText: el título entra palabra por palabra con desenfoque.
// A diferencia del original NO parte de opacity 0: el texto es legible desde el primer
// frame (importa para el LCP del h1) y solo se enfoca y sube. Con prefers-reduced-motion queda estático.
export default function BlurText({ text, as: Tag = 'h1', delay = 70, className = '' }: {
  text: string; as?: 'h1' | 'h2' | 'p'; delay?: number; className?: string
}) {
  const reduce = useReducedMotion()
  const words = text.split(' ')
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block will-change-[filter,transform]"
          initial={reduce ? false : { filter: 'blur(10px)', y: 14 }}
          animate={{ filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 0.6, delay: (i * delay) / 1000, ease: 'easeOut' }}
        >
          {w}{i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </Tag>
  )
}
