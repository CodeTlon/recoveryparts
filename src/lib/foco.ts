import type { CSSProperties } from 'react'

// Encuadre y zoom de una foto subida, guardados en el fragmento de su URL: `/media/x.webp#foco=50,30,1.4`
// (punto que queda a la vista, en % horizontal y vertical, y zoom de 1 a 3). Como en GC2 Entrenamiento: no hace
// falta una columna nueva en cada tabla con fotos y el fragmento no viaja por HTTP. Pero `next/image` sí lo
// mandaría al optimizador: todo lo que muestra una foto usa `sinFoco()` para el src y `estiloFoco()` para el estilo.
export type Foco = { x: number; y: number; zoom: number }

const FRAGMENTO = /#foco=(\d{1,3}),(\d{1,3})(?:,([1-3](?:\.\d{1,2})?))?$/
/** Lo que acepta la validación del servidor después de la ruta (ver `imagenOpcional`). */
export const FRAGMENTO_VALIDO = /^#foco=(?:100|\d{1,2}),(?:100|\d{1,2})(?:,(?:[12](?:\.\d{1,2})?|3))?$/

const entre = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export const sinFoco = <T extends string | null | undefined>(url: T): T => (url ? (url.split('#')[0] as T) : url)

export function leerFoco(url: string | null | undefined): Foco {
  const m = url?.match(FRAGMENTO)
  if (!m) return { x: 50, y: 50, zoom: 1 }
  return { x: entre(Number(m[1]), 0, 100), y: entre(Number(m[2]), 0, 100), zoom: m[3] ? entre(Number(m[3]), 1, 3) : 1 }
}

/** URL con el encuadre. El centro sin zoom es lo mismo que nada: se guarda la URL limpia. */
export function conFoco(url: string, f: Foco): string {
  const base = sinFoco(url)
  const x = Math.round(entre(f.x, 0, 100)), y = Math.round(entre(f.y, 0, 100)), zoom = Math.round(entre(f.zoom, 1, 3) * 100) / 100
  if (x === 50 && y === 50 && zoom === 1) return base
  return `${base}#foco=${x},${y}${zoom !== 1 ? `,${zoom}` : ''}`
}

/** Estilo para la imagen recortada (`object-cover`): qué parte queda a la vista y cuánto se acerca. */
export function estiloFoco(url: string | null | undefined): CSSProperties | undefined {
  if (!url?.includes('#')) return undefined
  const { x, y, zoom } = leerFoco(url)
  const pos = `${x}% ${y}%`
  return zoom > 1 ? { objectPosition: pos, transform: `scale(${zoom})`, transformOrigin: pos } : { objectPosition: pos }
}
