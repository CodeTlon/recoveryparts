'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Fila deslizable con flechas (las demás opiniones de la portada). Las tarjetas las arma el servidor y llegan como
// `<li>`; acá solo va el scroll. La primera tarjeta queda alineada con el contenido de la página (mismo padding que
// el contenedor de 1280 px) y la fila sigue hasta el borde de la pantalla, para que se vea asomar la próxima.
// Las flechas aparecen en pantallas medianas para arriba y solo si hay algo para deslizar; se apagan en los
// extremos. En el celular se desliza con el dedo. El scroll suave lo pone el CSS (`scroll-smooth`), así que con
// «reducir movimiento» se mueve sin animación.
export default function FilaDeslizable({ titulo, children }: { titulo: string; children: ReactNode }) {
  const lista = useRef<HTMLUListElement>(null)
  const id = useId()
  const [bordes, setBordes] = useState({ inicio: true, fin: true })

  useEffect(() => {
    const ul = lista.current
    if (!ul) return
    const medir = () => setBordes({ inicio: ul.scrollLeft <= 4, fin: ul.scrollLeft + ul.clientWidth >= ul.scrollWidth - 4 })
    medir()
    ul.addEventListener('scroll', medir, { passive: true })
    const ro = new ResizeObserver(medir)
    ro.observe(ul)
    return () => { ul.removeEventListener('scroll', medir); ro.disconnect() }
  }, [])

  // Avanza de a una tarjeta (su ancho más el espacio entre tarjetas).
  const mover = (dir: 1 | -1) => {
    const ul = lista.current
    const tarjeta = ul?.firstElementChild as HTMLElement | null
    if (!ul || !tarjeta) return
    ul.scrollBy({ left: dir * (tarjeta.offsetWidth + (parseFloat(getComputedStyle(ul).columnGap) || 0)) })
  }

  const hayScroll = !(bordes.inicio && bordes.fin)
  const flecha = 'btn-outline h-10 w-10 px-0 py-0'
  return (
    <div>
      <div className="mx-auto flex min-h-10 max-w-[1280px] items-center justify-between gap-4 px-4 md:px-12">
        <p className="text-sm font-semibold text-on-surface-variant">{titulo}</p>
        {hayScroll && (
          <div className="hidden gap-2 md:flex">
            <button type="button" aria-label="Anterior" aria-controls={id} disabled={bordes.inicio} onClick={() => mover(-1)} className={flecha}><ChevronLeft size={18} aria-hidden /></button>
            <button type="button" aria-label="Siguiente" aria-controls={id} disabled={bordes.fin} onClick={() => mover(1)} className={flecha}><ChevronRight size={18} aria-hidden /></button>
          </div>
        )}
      </div>
      {/* tabIndex: una región con scroll tiene que poder enfocarse para moverla con el teclado. */}
      <ul ref={lista} id={id} aria-label={titulo} tabIndex={0}
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] scroll-px-4 focus-visible:outline-offset-[-2px] motion-reduce:scroll-auto md:gap-5 md:px-[max(3rem,calc((100%_-_1280px)/2_+_3rem))] md:scroll-px-[max(3rem,calc((100%_-_1280px)/2_+_3rem))] [&::-webkit-scrollbar]:hidden">
        {children}
      </ul>
    </div>
  )
}
