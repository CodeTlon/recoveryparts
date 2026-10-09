'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Loader2, Video, X } from 'lucide-react'
import { comprimirImagen, comprimirVideo, MAX_SUBIDA, type Comprimido } from '@/lib/media'

// Campo de foto o video para formularios: comprime en el navegador, la sube a /api/media
// y guarda la URL final en un input oculto con el `name` del campo.
export function MediaField({ label, name, tipo, defaultValue, hint }: { label: string; name: string; tipo: 'imagen' | 'video'; defaultValue?: string | null; hint?: string }) {
  const id = useId()
  const [url, setUrl] = useState(defaultValue ?? '')
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')
  const esVideo = tipo === 'video'

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setError('')
    try {
      setEstado(esVideo ? 'Comprimiendo… 0%' : 'Comprimiendo…')
      const c: Comprimido = esVideo ? await comprimirVideo(f, p => setEstado(`Comprimiendo… ${Math.round(p * 100)}%`)) : await comprimirImagen(f)
      if (c.blob.size > MAX_SUBIDA) throw new Error('Quedó muy pesado (más de 25 MB). Usá un clip más corto.')
      setEstado('Subiendo…')
      const r = await fetch('/api/media', { method: 'POST', headers: { 'Content-Type': c.mime }, body: c.blob })
      const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!r.ok || !j.url) throw new Error(j.error ?? 'No se pudo subir el archivo.')
      setUrl(j.url)
    } catch (x) { setError(x instanceof Error ? x.message : 'No se pudo procesar el archivo.') }
    setEstado('')
  }

  const ocupado = !!estado
  const Icono = esVideo ? Video : ImagePlus
  return (
    <div className="sm:col-span-2">
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded border border-outline-variant bg-surface-container-high">
          {!url ? <span className="grid h-full place-items-center text-xs text-on-surface-variant">{esVideo ? 'Sin video' : 'Sin imagen'}</span>
            : esVideo ? <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            : <Image src={url} alt="" fill sizes="160px" className="object-cover" unoptimized={url.startsWith('http://')} />}
        </div>
        <div className="space-y-2">
          <label htmlFor={id} className="btn-ghost !px-3 !py-2 cursor-pointer">
            {ocupado ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Icono size={14} aria-hidden />}
            {ocupado ? estado : url ? `Cambiar ${tipo}` : `Subir ${tipo}`}
          </label>
          <input id={id} type="file" accept={esVideo ? 'video/*' : 'image/*'} className="sr-only" onChange={elegir} disabled={ocupado} />
          {url && !ocupado && <button type="button" onClick={() => setUrl('')} className="ml-2 inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-red-300"><X size={12} aria-hidden /> Quitar</button>}
          <p className="text-xs text-on-surface-variant">{hint ?? (esVideo ? 'Hasta 60 s. Se comprime solo a 720p (~3 MB por cada 30 s). Dejá la pestaña abierta mientras comprime.' : 'Cualquier foto. Se achica sola a WebP, máx. 1920 px.')}</p>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  )
}
