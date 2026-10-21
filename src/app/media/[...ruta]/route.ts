import { NextResponse, type NextRequest } from 'next/server'
import { infoArchivo, mimeDeArchivo } from '@/lib/storage'
import { respuestaArchivo } from '@/lib/archivo-http'

const TIPOS: Record<string, string> = {
  webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm',
}

// Archivos públicos del CMS (bucket `sitio`). Nombres con UUID: inmutables, se cachean un año.
// Soporta Range para que el video se pueda adelantar en Safari/iOS.
export async function GET(req: NextRequest, { params }: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await params
  if (ruta.length !== 1) return new NextResponse('No encontrado', { status: 404 })
  const ext = ruta[0].split('.').pop() ?? ''
  const info = TIPOS[ext] ? await infoArchivo('sitio', ruta[0]) : null
  if (!info) return new NextResponse('No encontrado', { status: 404 })

  // El tipo sale de los bytes: un video .webm recomprimido a MP4 (se reemplaza en el mismo archivo para no cambiar su URL)
  // tiene que servirse como video/mp4. La extensión solo se usa como respaldo.
  const mime = (await mimeDeArchivo(info.abs)) ?? TIPOS[ext]
  return respuestaArchivo(req.headers.get('range'), info, {
    'Content-Type': mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable',
  })
}
