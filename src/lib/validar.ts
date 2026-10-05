// Validaciones compartidas. Una URL que se guarda y después se renderiza en un href tiene que ser http(s):
// React 18 no bloquea `javascript:` en los href.

/** true si `u` es una URL http(s) válida. */
export function esUrlHttp(u: unknown): u is string {
  if (typeof u !== 'string') return false
  try { return ['http:', 'https:'].includes(new URL(u).protocol) } catch { return false }
}

/** Para campos opcionales de URL: '' → null, http(s) → la URL, otra cosa → undefined (inválida). */
export function urlOpcional(v: string): string | null | undefined {
  if (!v) return null
  return esUrlHttp(v) ? v : undefined
}

/** href seguro para renderizar: solo http(s), si no `undefined` (el link no se muestra). */
export const hrefSeguro = (u: string | null | undefined) => (esUrlHttp(u) ? u : undefined)

/** Firma real de la imagen (el `type` del File lo manda el cliente). Devuelve la extensión o null. */
export function extensionImagen(b: Uint8Array): 'png' | 'jpg' | 'webp' | 'avif' | null {
  const ascii = (a: number, n: number) => String.fromCharCode(...b.slice(a, a + n))
  if (b[0] === 0x89 && ascii(1, 3) === 'PNG') return 'png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'webp'
  if (ascii(4, 8) === 'ftypavif') return 'avif'
  return null
}
