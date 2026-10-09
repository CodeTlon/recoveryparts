import { Readable } from 'node:stream'
import { NextResponse, type NextRequest } from 'next/server'
import { infoArchivo, streamArchivo } from '@/lib/storage'

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

  const headers: Record<string, string> = {
    'Content-Type': TIPOS[ext], 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=31536000, immutable',
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '')
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(info.size - Number(m[2]), 0)
    const end = m[1] && m[2] ? Math.min(Number(m[2]), info.size - 1) : info.size - 1
    if (start > end || start >= info.size) return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } })
    return new NextResponse(Readable.toWeb(streamArchivo(info.abs, { start, end })) as ReadableStream, {
      status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${info.size}`, 'Content-Length': String(end - start + 1) },
    })
  }
  return new NextResponse(Readable.toWeb(streamArchivo(info.abs)) as ReadableStream, { headers: { ...headers, 'Content-Length': String(info.size) } })
}
