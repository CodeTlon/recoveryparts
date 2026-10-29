'use client'

import { useEffect, useRef } from 'react'
import { crearMotor, type MensajeCircuito, type Motor } from './circuito/motor'

// Fondo vivo del sitio público: pistas de circuito (como el hemisferio naranja del logo) por las que corren pulsos todo
// el tiempo. El puntero las enciende y atrae pulsos; un clic o un toque suelta una ráfaga desde las pistas cercanas.
// Canvas 2D sin librerías. Se pausa con la pestaña oculta o fuera de pantalla; con prefers-reduced-motion se dibuja
// una sola vez, quieto. Sin botón de pausa en la página: decisión de producto (ver DECISIONS.md). Es decorativo: aria-hidden y sin eventos propios (escucha el puntero en window).
//
// El dibujo (circuito/motor.ts) corre en un Web Worker con OffscreenCanvas: el hilo principal solo le pasa el tamaño,
// el puntero y si tiene que animar, así el fondo no compite con el scroll, los clics ni la carga. Sin OffscreenCanvas
// el mismo motor corre en la página.
//
// `modo="fondo"`: capa fija detrás de todo el sitio, tenue. `modo="hero"`: dentro de un contenedor relative, más denso.

// Cuántos fondos «hero» se ven ahora. Mientras haya alguno, el fondo fijo del sitio (tapado por la foto del hero) no
// dibuja: dos canvas animando a la vez era trabajo tirado.
let heroesVisibles = 0
const avisarHeroes = new Set<() => void>()
const cambiarHeroes = (d: number) => { heroesVisibles += d; avisarHeroes.forEach((f) => f()) }
// Worker de cada canvas: un canvas se transfiere a OffscreenCanvas una sola vez.
const workers = new WeakMap<HTMLCanvasElement, Worker>()

export default function CircuitField({ modo = 'fondo', className = '' }: { modo?: 'fondo' | 'hero'; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const hero = modo === 'hero'
    const css = getComputedStyle(document.documentElement)
    const color = (v: string, fallback: string) => css.getPropertyValue(v).trim() || fallback
    const opciones = {
      hero,
      tonos: [color('--rp-accent', '#f97316'), color('--rp-signal-blue', '#4f8be0'), color('--rp-signal-green', '#3fbf62')],
      base: color('--rp-outline-variant', '#44474d'),
    }
    const reducir = matchMedia('(prefers-reduced-motion: reduce)')

    let worker = workers.get(canvas) ?? null
    let local: Motor | null = null
    if (!worker && typeof OffscreenCanvas === 'function' && 'transferControlToOffscreen' in canvas) {
      try {
        worker = new Worker(new URL('./circuito/circuito.worker.ts', import.meta.url), { type: 'module' })
        const offscreen = canvas.transferControlToOffscreen()
        worker.postMessage({ tipo: 'iniciar', canvas: offscreen, opciones } satisfies MensajeCircuito, [offscreen])
        workers.set(canvas, worker)
      } catch { worker?.terminate(); worker = null }
    }
    if (!worker) local = crearMotor(canvas, document.createElement('canvas'), opciones)
    if (!worker && !local) return
    const llamar = (metodo: keyof Motor, ...args: unknown[]) => {
      if (worker) worker.postMessage({ tipo: 'llamar', metodo, args } satisfies MensajeCircuito)
      else (local![metodo] as (...a: unknown[]) => void)(...args)
    }

    let visible = true, listo = false, enHero = false
    const medir = () => {
      const r = canvas.getBoundingClientRect()
      llamar('medir', r.width, r.height, Math.min(window.devicePixelRatio || 1, 2))
    }
    const activo = () => listo && visible && !document.hidden && !reducir.matches && (hero || heroesVisibles === 0)
    const arrancar = () => llamar('animar', activo(), reducir.matches)

    const enCanvas = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const alMover = (e: PointerEvent) => llamar('mover', ...enCanvas(e))
    const alSalir = () => llamar('salir')
    const alTocar = (e: PointerEvent) => { if (activo()) llamar('tocar', ...enCanvas(e)) }

    medir() // las pistas se ven desde el primer momento; el movimiento arranca cuando la página terminó de cargar
    // Arranque diferido: después del evento load y de un momento ocioso, para no competir con la carga de la página.
    let idle = 0
    const empezar = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      const go = () => { listo = true; arrancar() }
      idle = ric ? ric(go, { timeout: 1500 }) : window.setTimeout(go, 600)
    }
    if (document.readyState === 'complete') empezar(); else window.addEventListener('load', empezar, { once: true })

    let espera = 0
    const ro = new ResizeObserver(() => { clearTimeout(espera); espera = window.setTimeout(medir, 150) })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      if (hero && e.isIntersecting !== enHero) { enHero = e.isIntersecting; cambiarHeroes(enHero ? 1 : -1) }
      visible = e.isIntersecting
      arrancar()
    })
    io.observe(canvas)
    if (!hero) avisarHeroes.add(arrancar)
    const alVisibilidad = () => arrancar()
    window.addEventListener('pointermove', alMover, { passive: true })
    window.addEventListener('pointerdown', alTocar, { passive: true })
    document.documentElement.addEventListener('pointerleave', alSalir)
    document.addEventListener('visibilitychange', alVisibilidad)
    reducir.addEventListener('change', arrancar)
    return () => {
      clearTimeout(espera); clearTimeout(idle)
      ;(window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idle)
      window.removeEventListener('load', empezar)
      if (enHero) cambiarHeroes(-1)
      avisarHeroes.delete(arrancar)
      ro.disconnect(); io.disconnect()
      window.removeEventListener('pointermove', alMover)
      window.removeEventListener('pointerdown', alTocar)
      document.documentElement.removeEventListener('pointerleave', alSalir)
      document.removeEventListener('visibilitychange', alVisibilidad)
      reducir.removeEventListener('change', arrancar)
      llamar('animar', false)
      // El worker se cierra solo si el canvas salió de la página: en desarrollo React vuelve a montar el efecto sobre
      // el mismo canvas, que ya no se puede transferir de nuevo, y tiene que seguir usando su worker.
      if (worker) setTimeout(() => { if (!canvas.isConnected) { worker.terminate(); workers.delete(canvas) } })
    }
  }, [modo])

  return <canvas ref={ref} aria-hidden className={`pointer-events-none ${modo === 'fondo' ? 'fixed inset-0 h-dvh w-full' : 'absolute inset-0 h-full w-full'} ${className}`} />
}
