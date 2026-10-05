'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { subirImagen } from '@/app/campus/admin/actions'

// Campo de imagen para formularios: sube el archivo al bucket público `sitio` y guarda la URL
// en un input oculto con el `name` del campo (reemplaza el "subila aparte y pegá la URL").
export function ImageField({ label, name, defaultValue, hint }: { label: string; name: string; defaultValue?: string | null; hint?: string }) {
  const id = useId()
  const [url, setUrl] = useState(defaultValue ?? '')
  const [estado, setEstado] = useState<'idle' | 'subiendo'>('idle')
  const [error, setError] = useState('')

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setError(''); setEstado('subiendo')
    const fd = new FormData(); fd.set('archivo', f)
    const r = await subirImagen({}, fd)
    setEstado('idle')
    if (r.error) setError(r.error); else if (r.url) setUrl(r.url)
  }

  return (
    <div className="sm:col-span-2">
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded border border-outline-variant bg-surface-container-high">
          {url ? <Image src={url} alt="" fill sizes="160px" className="object-cover" unoptimized={url.startsWith('http://')} />
            : <span className="grid h-full place-items-center text-xs text-on-surface-variant">Sin imagen</span>}
        </div>
        <div className="space-y-2">
          <label htmlFor={id} className="btn-ghost !px-3 !py-2 cursor-pointer">
            {estado === 'subiendo' ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ImagePlus size={14} aria-hidden />}
            {estado === 'subiendo' ? 'Subiendo…' : url ? 'Cambiar imagen' : 'Subir imagen'}
          </label>
          <input id={id} type="file" accept="image/webp,image/avif,image/jpeg,image/png" className="sr-only" onChange={elegir} disabled={estado === 'subiendo'} />
          {url && <button type="button" onClick={() => setUrl('')} className="ml-2 inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-red-300"><X size={12} aria-hidden /> Quitar</button>}
          <p className="text-xs text-on-surface-variant">{hint ?? 'WebP, AVIF, JPG o PNG de hasta 8 MB.'}</p>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  )
}
