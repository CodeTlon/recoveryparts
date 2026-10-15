import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { usuarioApi } from '@/lib/auth'
import { guardarArchivo, tipoMedia, urlPublica } from '@/lib/storage'
import { transcodeWithService } from '@/lib/transcode'

const MAX = 25 * 1024 * 1024

// Subida de fotos y videos del CMS (el navegador ya los comprimió). Solo admin. El cuerpo es el archivo crudo;
// el tipo se decide por sus bytes, no por el Content-Type que manda el cliente.
export async function POST(req: NextRequest) {
  const u = await usuarioApi()
  if (!u || u.perfil.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // Anti-CSRF: el POST tiene que venir de este mismo sitio.
  const origen = req.headers.get('origin')
  if (!origen || new URL(origen).host !== req.headers.get('host')) return NextResponse.json({ error: 'Origen inválido' }, { status: 403 })
  if (Number(req.headers.get('content-length') ?? 0) > MAX) return NextResponse.json({ error: 'El archivo supera los 25 MB.' }, { status: 413 })

  const datos = new Uint8Array(await req.arrayBuffer())
  if (!datos.length || datos.length > MAX) return NextResponse.json({ error: 'El archivo supera los 25 MB.' }, { status: 413 })
  const tipo = tipoMedia(datos)
  if (!tipo) return NextResponse.json({ error: 'Formato no permitido.' }, { status: 415 })
  let ext: string = tipo.ext
  let contenido: Uint8Array = datos
  // Videos: el servicio global los recomprime a MP4 (soft-fail: si no responde, queda el que mandó el navegador).
  if (tipo.mime.startsWith('video/')) {
    const comprimido = await transcodeWithService(Buffer.from(datos), 'web')
    if (comprimido) { contenido = comprimido; ext = 'mp4' }
  }
  const nombre = `${randomUUID()}.${ext}`
  await guardarArchivo('sitio', nombre, contenido)
  return NextResponse.json({ url: urlPublica(nombre) })
}
