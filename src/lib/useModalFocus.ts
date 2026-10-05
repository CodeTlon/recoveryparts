'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Manejo de foco de un diálogo modal: al abrir enfoca el primer control, atrapa el Tab dentro y,
 * al cerrar, devuelve el foco a lo que lo tenía (el botón que lo abrió).
 */
export function useModalFocus(ref: RefObject<HTMLElement | null>, abierto: boolean) {
  useEffect(() => {
    const el = ref.current
    if (!abierto || !el) return
    const previo = document.activeElement as HTMLElement | null
    const items = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
    items()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const f = items()
      if (!f.length) return
      const primero = f[0], ultimo = f[f.length - 1]
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
    }
    el.addEventListener('keydown', onKey)
    return () => { el.removeEventListener('keydown', onKey); previo?.focus?.() }
  }, [ref, abierto])
}
