'use client'

import { useEffect, useRef } from 'react'

// Cursor propio del sitio público: un nodo naranja (el punto exacto del puntero) y un anillo que lo sigue con un poco
// de retraso, como un nodo del circuito del logo. Sobre algo clicable el anillo crece; al hacer clic se achica.
// Solo con mouse (pointer: fine) y sin «reducir movimiento»; en el celular y en el campus queda el cursor del sistema.
// Los campos de texto conservan la barra de texto del sistema (globals.css § Cursor propio). Un solo
// requestAnimationFrame que se detiene cuando el anillo alcanzó al puntero: quieto no consume nada.
const CLICABLE = 'a, button, summary, label, select, [role="button"], [role="tab"], input[type="checkbox"], input[type="radio"], input[type="submit"]'
const TEXTO = 'input:not([type="checkbox"], [type="radio"], [type="submit"], [type="range"]), textarea, [contenteditable="true"]'

export default function CursorCircuito() {
  const punto = useRef<HTMLDivElement>(null)
  const anillo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const apto = matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)')
    if (!apto.matches || !punto.current || !anillo.current) return
    const p = punto.current, a = anillo.current
    const raiz = document.documentElement
    raiz.classList.add('cursor-propio')
    let x = -100, y = -100, ax = -100, ay = -100, cuadro = 0

    const mover = () => {
      ax += (x - ax) * 0.28; ay += (y - ay) * 0.28
      a.style.translate = `${ax}px ${ay}px`
      cuadro = Math.abs(x - ax) + Math.abs(y - ay) > 0.3 ? requestAnimationFrame(mover) : 0
    }
    const alMover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x = e.clientX; y = e.clientY
      p.style.translate = `${x}px ${y}px`
      const el = e.target instanceof Element ? e.target : null
      const texto = !!el?.closest(TEXTO)
      raiz.dataset.cursor = texto ? 'texto' : el?.closest(CLICABLE) ? 'clic' : ''
      raiz.dataset.cursorVisible = 'si'
      if (!cuadro) cuadro = requestAnimationFrame(mover)
    }
    const salir = (e: MouseEvent) => { if (!e.relatedTarget) raiz.dataset.cursorVisible = '' } // salió de la ventana (o entró a un mapa embebido)
    const apretar = () => { raiz.dataset.cursorApretado = 'si' }
    const soltar = () => { raiz.dataset.cursorApretado = '' }

    addEventListener('pointermove', alMover, { passive: true })
    document.addEventListener('mouseout', salir)
    addEventListener('pointerdown', apretar)
    addEventListener('pointerup', soltar)
    return () => {
      cancelAnimationFrame(cuadro)
      removeEventListener('pointermove', alMover)
      document.removeEventListener('mouseout', salir)
      removeEventListener('pointerdown', apretar)
      removeEventListener('pointerup', soltar)
      raiz.classList.remove('cursor-propio')
      delete raiz.dataset.cursor; delete raiz.dataset.cursorVisible; delete raiz.dataset.cursorApretado
    }
  }, [])

  return (
    <div aria-hidden className="cursor-circuito">
      <div ref={anillo} className="cursor-anillo"><span /></div>
      <div ref={punto} className="cursor-punto"><span /></div>
    </div>
  )
}
