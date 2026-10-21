import { NextResponse, after, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { usuarioApi } from '@/lib/auth'
import { guardarArchivo, reemplazarArchivo, tipoMedia, urlPublica } from '@/lib/storage'
import { transcodeWithService } from '@/lib/transcode'

const MAX = 25 * 1024 * 1024

async function leerConTope(req: NextRequest, max: number): Promise<Uint8Array | null> {
  if (!req.body) return new Uint8Array(0)
  const partes: Uint8Array[] = []
  let total = 0
  const lector = req.body.getReader()
  for (;;) {
    const { done, value } = await lector.read()
    if (done) break
    total += value.length
    if (total > max) { await lector.cancel(); return null }
    partes.push(value)
  }
  const out = new Uint8Array(total)
  let pos = 0
  for (const p of partes) { out.set(p, pos); pos += p.length }
  return out
}

// Subida de fotos y videos del CMS (el navegador ya los comprimió). Solo admin. El cuerpo es el archivo crudo;
// el tipo se decide por sus bytes, no por el Content-Type que manda el cliente.
export async function POST(req: NextRequest) {
  const u = await usuarioApi()
  if (!u || u.perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // Anti-CSRF: el POST tiene que venir de este mismo sitio.
  const origen = req.headers.get('origin')
  if (!origen || new URL(origen).host !== req.headers.get('host')) return NextResponse.json({ error: 'Origen inválido' }, { status: 403 })
  if (Number(req.headers.get('content-length') ?? 0) > MAX) return NextResponse.json({ error: 'El archivo supera los 25 MB.' }, { status: 413 })

  // Se lee por tramos y se corta al pasar el tope: Content-Length puede faltar o mentir, y arrayBuffer() cargaría todo.
  const datos = await leerConTope(req, MAX)
  if (!datos) return NextResponse.json({ error: 'El archivo supera los 25 MB.' }, { status: 413 })
  if (!datos.length) return NextResponse.json({ error: 'Archivo vacío.' }, { status: 400 })
  const tipo = tipoMedia(datos)
  if (!tipo) return NextResponse.json({ error: 'Formato no permitido.' }, { status: 415 })
  const nombre = `${randomUUID()}.${tipo.ext}`
  await guardarArchivo('sitio', nombre, datos)
  // Videos MP4: el servicio global los recomprime EN SEGUNDO PLANO (puede tardar minutos y el admin no tiene que
  // esperar con el request abierto, que además puede cortar el proxy). La URL ya es válida con el original; cuando
  // termina, el archivo se reemplaza en el mismo lugar (soft-fail: si el servicio no responde, queda el original).
  // Solo MP4: la compresión devuelve MP4 y no se puede cambiar la extensión de una URL ya entregada.
  if (tipo.ext === 'mp4') {
    after(async () => {
      const comprimido = await transcodeWithService(Buffer.from(datos.buffer, datos.byteOffset, datos.length), 'web')
      if (comprimido) await reemplazarArchivo('sitio', nombre, comprimido).catch((e) => console.error('[transcode] no se pudo reemplazar el original:', e instanceof Error ? e.message : e))
    })
  }
  return NextResponse.json({ url: urlPublica(nombre) })
}
