'use client'

import { useEffect, useRef } from 'react'

// Fondo vivo del sitio público: pistas de circuito (como el hemisferio naranja del logo) por las que corren pulsos todo
// el tiempo. El puntero las enciende y atrae pulsos; un clic o un toque suelta una ráfaga desde las pistas cercanas.
// Canvas 2D sin librerías. Se pausa con la pestaña oculta o fuera de pantalla; con prefers-reduced-motion se dibuja
// una sola vez, quieto. Sin botón de pausa en la página: decisión de producto (ver DECISIONS.md). Es decorativo: aria-hidden y sin eventos propios (escucha el puntero en window).
//
// `modo="fondo"`: capa fija detrás de todo el sitio, tenue. `modo="hero"`: dentro de un contenedor relative, más denso.

type P = { x: number; y: number }
type Pista = { pts: P[]; acum: number[]; largo: number; brillo: number; tono: number }
type Pulso = { pista: Pista; pos: number; vel: number; tono: number; vida: number }

const DIRS: P[] = [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }]

function armarPistas(ancho: number, alto: number, celda: number, densidad: number): Pista[] {
  const cols = Math.ceil(ancho / celda) + 1
  const filas = Math.ceil(alto / celda) + 1
  const ocupado = new Uint8Array(cols * filas)
  const libre = (c: number, f: number) => c >= 0 && f >= 0 && c < cols && f < filas && !ocupado[f * cols + c]
  const pistas: Pista[] = []
  const cantidad = Math.round((cols * filas) / densidad)
  for (let n = 0, intentos = 0; n < cantidad && intentos < cantidad * 6; intentos++) {
    let c = Math.floor(Math.random() * cols)
    let f = Math.floor(Math.random() * filas)
    if (!libre(c, f)) continue
    // Las pistas de un PCB corren rectas y doblan a 45°: se arranca en horizontal o vertical.
    let d = [0, 2, 4, 6][Math.floor(Math.random() * 4)]
    const pts: P[] = [{ x: c, y: f }]
    ocupado[f * cols + c] = 1
    const tramos = 2 + Math.floor(Math.random() * 5)
    for (let t = 0; t < tramos; t++) {
      const pasos = 1 + Math.floor(Math.random() * 5)
      let avanzo = 0
      for (let s = 0; s < pasos; s++) {
        const nc = c + DIRS[d].x, nf = f + DIRS[d].y
        if (!libre(nc, nf)) break
        c = nc; f = nf; ocupado[f * cols + c] = 1; avanzo++
      }
      if (avanzo) pts.push({ x: c, y: f })
      d = (d + (Math.random() < 0.5 ? 1 : 7)) % 8
    }
    if (pts.length < 2) continue
    const enPx = pts.map((p) => ({ x: p.x * celda, y: p.y * celda }))
    const acum = [0]
    for (let i = 1; i < enPx.length; i++) acum.push(acum[i - 1] + Math.hypot(enPx[i].x - enPx[i - 1].x, enPx[i].y - enPx[i - 1].y))
    // tono: 0 naranja (circuito), 1 azul, 2 verde (mundo). La mayoría naranja, como el logo leído de izquierda a derecha.
    const r = Math.random()
    pistas.push({ pts: enPx, acum, largo: acum[acum.length - 1], brillo: 0, tono: r < 0.7 ? 0 : r < 0.88 ? 1 : 2 })
    n++
  }
  return pistas
}

function puntoEn(p: Pista, dist: number): P {
  let i = 1
  while (i < p.acum.length - 1 && p.acum[i] < dist) i++
  const a = p.pts[i - 1], b = p.pts[i]
  const tramo = p.acum[i] - p.acum[i - 1] || 1
  const t = Math.min(1, Math.max(0, (dist - p.acum[i - 1]) / tramo))
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function distanciaA(p: Pista, q: P) {
  let min = Infinity
  for (let i = 1; i < p.pts.length; i++) {
    const a = p.pts[i - 1], b = p.pts[i]
    const dx = b.x - a.x, dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
    min = Math.min(min, Math.hypot(a.x + dx * t - q.x, a.y + dy * t - q.y))
  }
  return min
}

// Cuántos fondos «hero» se ven ahora. Mientras haya alguno, el fondo fijo del sitio (tapado por la foto del hero) no
// dibuja: dos canvas animando a la vez era trabajo tirado.
let heroesVisibles = 0
const avisarHeroes = new Set<() => void>()
const cambiarHeroes = (d: number) => { heroesVisibles += d; avisarHeroes.forEach((f) => f()) }

export default function CircuitField({ modo = 'fondo', className = '' }: { modo?: 'fondo' | 'hero'; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const hero = modo === 'hero'
    const css = getComputedStyle(document.documentElement)
    const color = (v: string, fallback: string) => css.getPropertyValue(v).trim() || fallback
    const tonos = [color('--rp-accent', '#f97316'), color('--rp-signal-blue', '#4f8be0'), color('--rp-signal-green', '#3fbf62')]
    const base = color('--rp-outline-variant', '#44474d')
    const reducir = matchMedia('(prefers-reduced-motion: reduce)')

    // Rendimiento (celulares): las pistas quietas se dibujan UNA vez en una capa aparte y cada cuadro solo la copia y
    // pinta encima los pulsos y las pistas encendidas. La cercanía al puntero se calcula cuando el puntero se mueve,
    // no en cada cuadro. Si un cuadro cuesta más de ~8 ms, se baja a 30 cuadros por segundo.
    const capa = document.createElement('canvas')
    const cctx = capa.getContext('2d')!
    let ancho = 0, alto = 0, dpr = 1
    let pistas: Pista[] = []
    let pulsos: Pulso[] = []
    let raf = 0, visible = true, ultimo = 0, ultimoDibujo = 0, intervalo = 0, costo = 0, listo = false, enHero = false
    let punteroMovido = false
    const puntero = { x: -9999, y: -9999, activo: false }
    const deriva = { x: 0, y: 0 }
    const RADIO = hero ? 190 : 150
    const alfaBase = hero ? 0.55 : 0.32
    const objetivo = new Map<Pista, number>()

    const trazar = (c: CanvasRenderingContext2D, p: Pista) => {
      c.beginPath()
      p.pts.forEach((pt, i) => (i ? c.lineTo(pt.x, pt.y) : c.moveTo(pt.x, pt.y)))
      c.stroke()
      // Nodos en los extremos: aros huecos, como las terminales del logo.
      for (const pt of [p.pts[0], p.pts[p.pts.length - 1]]) { c.beginPath(); c.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2); c.stroke() }
    }

    const medir = () => {
      const r = canvas.getBoundingClientRect()
      ancho = r.width; alto = r.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      for (const c of [canvas, capa]) { c.width = Math.round(ancho * dpr); c.height = Math.round(alto * dpr) }
      const chico = ancho < 640
      intervalo = chico ? 1000 / 30 : 0
      pistas = armarPistas(ancho, alto, hero ? (chico ? 26 : 30) : (chico ? 34 : 40), hero ? 9 : 13)
      pulsos = []
      objetivo.clear()
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cctx.clearRect(0, 0, ancho, alto)
      cctx.lineCap = 'round'; cctx.lineJoin = 'round'; cctx.lineWidth = 1.25
      cctx.globalAlpha = alfaBase; cctx.strokeStyle = base
      for (const p of pistas) trazar(cctx, p)
    }

    const lanzar = (p: Pista, tono = p.tono, rapido = false) => {
      if (pulsos.length > (hero ? 110 : 70)) return
      const haciaAtras = Math.random() < 0.5
      const vel = (rapido ? 260 : 70 + Math.random() * 90) * (haciaAtras ? -1 : 1)
      pulsos.push({ pista: p, pos: haciaAtras ? p.largo : 0, vel, tono, vida: 1 })
    }

    const dibujar = (dt: number) => {
      // Un canvas oculto (p. ej. el panel del login en el celular) mide 0×0 y drawImage de una capa vacía tira error.
      if (!capa.width || !capa.height) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, ancho, alto)
      // Deriva suave hacia el lado contrario del puntero: paralaje de unos pocos píxeles.
      const objetivoX = puntero.activo ? (puntero.x - ancho / 2) * -0.012 : 0
      const objetivoY = puntero.activo ? (puntero.y - alto / 2) * -0.012 : 0
      deriva.x += (objetivoX - deriva.x) * Math.min(1, dt * 3)
      deriva.y += (objetivoY - deriva.y) * Math.min(1, dt * 3)
      ctx.translate(deriva.x, deriva.y)
      ctx.globalAlpha = 1
      ctx.drawImage(capa, 0, 0, ancho, alto)

      // Cercanía al puntero: solo si se movió desde el último cuadro.
      if (punteroMovido) {
        punteroMovido = false
        const q = { x: puntero.x - deriva.x, y: puntero.y - deriva.y }
        objetivo.clear()
        if (puntero.activo) for (const p of pistas) { const c = 1 - distanciaA(p, q) / RADIO; if (c > 0) objetivo.set(p, c) }
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.25
      for (const p of pistas) {
        const meta = objetivo.get(p) ?? 0
        if (!meta && p.brillo < 0.02) continue
        p.brillo += (meta - p.brillo) * Math.min(1, dt * 6)
        if (meta > 0.35 && Math.random() < dt * 2.5) lanzar(p)
        ctx.globalAlpha = p.brillo * 0.85
        ctx.strokeStyle = tonos[p.tono]
        trazar(ctx, p)
      }

      // Pulsos: cabeza brillante con una estela que se apaga.
      const estela = hero ? 46 : 34
      pulsos = pulsos.filter((u) => {
        u.pos += u.vel * dt
        if (u.pos < -estela || u.pos > u.pista.largo + estela) return false
        const dir = Math.sign(u.vel)
        const cola = Math.min(u.pista.largo, Math.max(0, u.pos - dir * estela))
        const cabeza = Math.min(u.pista.largo, Math.max(0, u.pos))
        const pasos = 4
        ctx.strokeStyle = tonos[u.tono]
        for (let s = 0; s < pasos; s++) {
          const a = puntoEn(u.pista, cola + ((cabeza - cola) * s) / pasos)
          const b = puntoEn(u.pista, cola + ((cabeza - cola) * (s + 1)) / pasos)
          ctx.globalAlpha = ((s + 1) / pasos) * 0.9
          ctx.lineWidth = 1 + ((s + 1) / pasos) * 1.4
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        }
        const h = puntoEn(u.pista, cabeza)
        ctx.globalAlpha = 0.22; ctx.fillStyle = tonos[u.tono]
        ctx.beginPath(); ctx.arc(h.x, h.y, 7, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
        ctx.beginPath(); ctx.arc(h.x, h.y, 2, 0, Math.PI * 2); ctx.fill()
        return true
      })
      ctx.globalAlpha = 1
    }

    const activo = () => listo && visible && !document.hidden && !reducir.matches && (hero || heroesVisibles === 0)
    const cuadro = (t: number) => {
      raf = activo() ? requestAnimationFrame(cuadro) : 0
      if (intervalo && t - ultimoDibujo < intervalo - 1) return
      const dt = Math.min(0.05, (t - (ultimo || t)) / 1000)
      ultimo = t; ultimoDibujo = t
      // Pulsos espontáneos: el circuito nunca queda quieto aunque nadie mueva el mouse.
      if (pistas.length && Math.random() < dt * (hero ? 7 : 3.5)) lanzar(pistas[Math.floor(Math.random() * pistas.length)])
      const t0 = performance.now()
      dibujar(dt)
      costo = costo * 0.9 + (performance.now() - t0) * 0.1
      if (costo > 8) intervalo = 1000 / 30
    }
    const arrancar = () => {
      if (activo()) { if (!raf) { ultimo = 0; raf = requestAnimationFrame(cuadro) } return }
      cancelAnimationFrame(raf); raf = 0
      if (reducir.matches) { pulsos = []; dibujar(0) }
    }

    const alMover = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      puntero.x = e.clientX - r.left; puntero.y = e.clientY - r.top
      puntero.activo = puntero.x > -RADIO && puntero.y > -RADIO && puntero.x < ancho + RADIO && puntero.y < alto + RADIO
      punteroMovido = true
    }
    const alSalir = () => { puntero.activo = false; punteroMovido = true }
    const alTocar = (e: PointerEvent) => {
      if (!activo()) return
      alMover(e)
      if (!puntero.activo) return
      const q = { x: puntero.x - deriva.x, y: puntero.y - deriva.y }
      for (const p of pistas) if (distanciaA(p, q) < RADIO * 1.3) { p.brillo = 1; lanzar(p, p.tono, true); lanzar(p, 0, true) }
    }

    medir()
    dibujar(0) // las pistas se ven desde el primer momento; el movimiento arranca cuando la página terminó de cargar
    // Arranque diferido: después del evento load y de un momento ocioso, para no competir con la carga de la página.
    let idle = 0
    const empezar = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      const go = () => { listo = true; arrancar() }
      idle = ric ? ric(go, { timeout: 1500 }) : window.setTimeout(go, 600)
    }
    if (document.readyState === 'complete') empezar(); else window.addEventListener('load', empezar, { once: true })

    let espera = 0
    const ro = new ResizeObserver(() => { clearTimeout(espera); espera = window.setTimeout(() => { medir(); dibujar(0) }, 150) })
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
      cancelAnimationFrame(raf); clearTimeout(espera); clearTimeout(idle)
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
    }
  }, [modo])

  return <canvas ref={ref} aria-hidden className={`pointer-events-none ${modo === 'fondo' ? 'fixed inset-0 h-dvh w-full' : 'absolute inset-0 h-full w-full'} ${className}`} />
}
