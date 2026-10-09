// Compresión en el NAVEGADOR antes de subir (RF-CMS): Vercel limita el cuerpo de un request a 4,5 MB,
// así que las fotos y los videos se achican acá y se suben directo a Storage con una URL firmada.
// Meta: que no se note la pérdida de calidad y que la página cargue rápido.

export const IMG_MAX_LADO = 1920       // px del lado mayor
export const IMG_CALIDAD = 0.82        // WebP
export const VIDEO_MAX_LADO = 1280     // 720p vertical u horizontal
export const VIDEO_MAX_SEG = 60
export const VIDEO_BITRATE = 1_000_000 // ~1 Mbps a 720p: un clip de 30 s queda en ~3-4 MB
export const MAX_SUBIDA = 25 * 1024 * 1024

export type Comprimido = { blob: Blob; ext: 'webp' | 'jpg' | 'mp4' | 'webm'; mime: string }

const escala = (w: number, h: number, max: number) => { const k = Math.min(1, max / Math.max(w, h)); return [Math.round(w * k), Math.round(h * k)] as const }

/** Foto → WebP (máx. 1920 px, calidad 82). Si el navegador no puede codificar WebP, usa JPEG. */
export async function comprimirImagen(f: File): Promise<Comprimido> {
  const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' })
  const [w, h] = escala(bmp.width, bmp.height, IMG_MAX_LADO)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h); bmp.close()
  const salida = (tipo: string) => new Promise<Blob | null>(r => c.toBlob(r, tipo, IMG_CALIDAD))
  const webp = await salida('image/webp')
  if (webp?.type === 'image/webp') return { blob: webp, ext: 'webp', mime: 'image/webp' }
  const jpg = await salida('image/jpeg')
  if (!jpg) throw new Error('No se pudo procesar la imagen.')
  return { blob: jpg, ext: 'jpg', mime: 'image/jpeg' }
}

/** Video → MP4/WebM a ≤720p y ~1 Mbps. Re-codifica reproduciéndolo (tarda lo que dura el clip). */
export async function comprimirVideo(f: File, onProgreso?: (p: number) => void): Promise<Comprimido> {
  const tipos = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  const mime = tipos.find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t))
  if (!mime) throw new Error('Este navegador no puede comprimir video. Probá con Chrome o Safari actualizado.')

  const v = document.createElement('video')
  const url = URL.createObjectURL(f)
  v.src = url; v.playsInline = true; v.preload = 'auto'
  try {
    await new Promise<void>((ok, no) => { v.onloadedmetadata = () => ok(); v.onerror = () => no(new Error('No se pudo leer el video.')) })
    if (v.duration > VIDEO_MAX_SEG) throw new Error(`El video dura más de ${VIDEO_MAX_SEG} segundos. Recortalo o usá un link de YouTube.`)
    const [w, h] = escala(v.videoWidth, v.videoHeight, VIDEO_MAX_LADO)
    const c = document.createElement('canvas'); c.width = w & ~1; c.height = h & ~1
    const ctx = c.getContext('2d')!
    const salida = c.captureStream(30)
    // Audio: se toma del propio video (si el navegador lo expone). Un reel sin audio también sirve.
    const cap = (v as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.()
    cap?.getAudioTracks().forEach(t => salida.addTrack(t))
    const rec = new MediaRecorder(salida, { mimeType: mime, videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: 96_000 })
    const partes: Blob[] = []
    rec.ondataavailable = e => { if (e.data.size) partes.push(e.data) }
    const fin = new Promise<void>(r => { rec.onstop = () => r() })
    let vivo = true
    const pintar = () => {
      if (!vivo) return
      ctx.drawImage(v, 0, 0, c.width, c.height)
      onProgreso?.(Math.min(0.99, v.currentTime / v.duration))
      requestAnimationFrame(pintar)
    }
    rec.start(1000); await v.play(); pintar()
    await new Promise<void>(r => { v.onended = () => r() })
    vivo = false; rec.stop(); await fin
    onProgreso?.(1)
    const blob = new Blob(partes, { type: mime.split(';')[0] })
    return { blob, ext: blob.type === 'video/mp4' ? 'mp4' : 'webm', mime: blob.type }
  } finally { URL.revokeObjectURL(url) }
}
