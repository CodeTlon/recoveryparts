import 'server-only'
import { Readable } from 'node:stream'
import { NextResponse } from 'next/server'
import { streamArchivo } from '@/lib/storage'

/** Responde un archivo de disco por streaming, con `Content-Length` y soporte de `Range` (206/416), sin cargarlo entero
 *  en memoria. El llamador pone Content-Type, Cache-Control, etc. en `headers`. */
export function respuestaArchivo(rangoHeader: string | null, info: { size: number; abs: string }, headers: Record<string, string>) {
  const base = { 'Accept-Ranges': 'bytes', ...headers }
  const m = /^bytes=(\d*)-(\d*)$/.exec(rangoHeader ?? '')
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(info.size - Number(m[2]), 0)
    const end = m[1] && m[2] ? Math.min(Number(m[2]), info.size - 1) : info.size - 1
    if (start > end || start >= info.size) return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } })
    return new NextResponse(Readable.toWeb(streamArchivo(info.abs, { start, end })) as ReadableStream, {
      status: 206, headers: { ...base, 'Content-Range': `bytes ${start}-${end}/${info.size}`, 'Content-Length': String(end - start + 1) },
    })
  }
  return new NextResponse(Readable.toWeb(streamArchivo(info.abs)) as ReadableStream, { headers: { ...base, 'Content-Length': String(info.size) } })
}
