import { NextResponse, type NextRequest } from 'next/server'
import { infoArchivo } from '@/lib/storage'
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

  return respuestaArchivo(req.headers.get('range'), info, {
    'Content-Type': TIPOS[ext], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable',
  })
}
