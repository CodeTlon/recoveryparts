import type { Metadata } from 'next'

export const NOMBRE_SITIO = 'Recovery Parts'

/** Recorta a `max` caracteres en el último espacio y agrega «…» (colapsa saltos de línea y espacios). */
export function recortar(texto: string | null | undefined, max = 160): string | undefined {
  const t = texto?.replace(/\s+/g, ' ').trim()
  if (!t) return undefined
  if (t.length <= max) return t
  const corte = t.slice(0, max - 1)
  return `${corte.slice(0, Math.max(corte.lastIndexOf(' '), 40)).trimEnd()}…`
}

/** Metadata de una página pública: título, descripción, canónica (sin parámetros) y Open Graph / Twitter propios.
 *  Next no fusiona `openGraph` en profundidad: si la página no lo define, hereda el de la home. */
export function metaPagina({ titulo, descripcion, ruta, imagen }: { titulo: string; descripcion?: string; ruta: string; imagen?: string | null }): Metadata {
  const tituloSocial = `${titulo} · ${NOMBRE_SITIO}`
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: { type: 'website', locale: 'es_AR', siteName: NOMBRE_SITIO, title: tituloSocial, description: descripcion, url: ruta, ...(imagen ? { images: [imagen] } : {}) },
    twitter: { card: 'summary_large_image', title: tituloSocial, description: descripcion, ...(imagen ? { images: [imagen] } : {}) },
  }
}
