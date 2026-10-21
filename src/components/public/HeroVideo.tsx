'use client'

import { useEffect, useRef } from 'react'

// Video decorativo de la portada. No arranca solo si la persona pidió menos movimiento (prefers-reduced-motion): se
// queda el póster. Sin `autoPlay` en el HTML, el arranque lo decide esta preferencia al hidratar.
export default function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)')
    const aplicar = () => { if (reducir.matches) v.pause(); else v.play().catch(() => {}) }
    aplicar()
    reducir.addEventListener('change', aplicar)
    return () => reducir.removeEventListener('change', aplicar)
  }, [])
  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
}
