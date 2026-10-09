import 'server-only'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

// Archivos en disco (volumen persistente en Coolify). Dos "buckets":
//  - materiales: PDFs privados `{curso_id}/{uuid}.pdf`; solo se leen por /api/material/[id] tras validar acceso.
//  - sitio: fotos y videos del CMS, públicos, se sirven por /media/[...ruta].
export type Bucket = 'materiales' | 'sitio'
const SEGMENTO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export const STORAGE_DIR = resolve(process.env.STORAGE_DIR ?? './storage')

// Resuelve la ruta dentro del bucket y rechaza todo lo que se escape (.., absolutas, caracteres raros).
function ruta(bucket: Bucket, path: string): string {
  const partes = path.split('/')
  if (!partes.length || partes.length > 2 || !partes.every((p) => SEGMENTO.test(p) && !p.includes('..')))
    throw new Error('Ruta de archivo inválida')
  const base = join(STORAGE_DIR, bucket)
  const abs = resolve(base, ...partes)
  if (!abs.startsWith(base + sep)) throw new Error('Ruta de archivo inválida')
  return abs
}

export async function guardarArchivo(bucket: Bucket, path: string, datos: Uint8Array | Buffer) {
  const abs = ruta(bucket, path)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, datos, { flag: 'wx' }) // wx: nunca pisa un archivo existente
}

export async function leerArchivo(bucket: Bucket, path: string): Promise<Buffer | null> {
  try { return await readFile(ruta(bucket, path)) } catch { return null }
}

export async function borrarArchivo(bucket: Bucket, path: string) {
  try { await rm(ruta(bucket, path), { force: true }) } catch {}
}

export async function infoArchivo(bucket: Bucket, path: string): Promise<{ size: number; abs: string } | null> {
  try {
    const abs = ruta(bucket, path)
    const s = await stat(abs)
    return s.isFile() ? { size: s.size, abs } : null
  } catch { return null }
}

export const streamArchivo = (abs: string, rango?: { start: number; end: number }) => createReadStream(abs, rango)

export const urlPublica = (path: string) => `/media/${path}`

// Tipo real del archivo según sus primeros bytes (el Content-Type del cliente no es confiable).
export function tipoMedia(b: Uint8Array): { ext: 'webp' | 'jpg' | 'png' | 'avif' | 'mp4' | 'webm'; mime: string } | null {
  const s = (i: number, t: string) => t.split('').every((c, k) => b[i + k] === c.charCodeAt(0))
  if (s(0, 'RIFF') && s(8, 'WEBP')) return { ext: 'webp', mime: 'image/webp' }
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (b[0] === 0x89 && s(1, 'PNG')) return { ext: 'png', mime: 'image/png' }
  if (s(4, 'ftypavif') || s(4, 'ftypavis')) return { ext: 'avif', mime: 'image/avif' }
  if (s(4, 'ftyp')) return { ext: 'mp4', mime: 'video/mp4' }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { ext: 'webm', mime: 'video/webm' }
  return null
}
