'use client'

import { useActionState } from 'react'
import { subirImagen } from '@/app/campus/admin/actions'

// Sube al bucket público `sitio` y muestra la URL para pegar en los campos de imagen.
export default function ImageUploader() {
  const [s, run, pending] = useActionState(subirImagen, {} as { url?: string; error?: string })
  return (
    <form action={run} className="card space-y-3 p-6">
      <h3 className="font-semibold">Subir imagen</h3>
      <p className="text-xs text-on-surface-variant">WebP, AVIF, JPG o PNG de hasta 8 MB. Preferí imágenes limpias, sin exceso de texto superpuesto. Para fotos de alumnos o egresados necesitás su consentimiento de uso de imagen.</p>
      <input name="archivo" type="file" accept="image/webp,image/avif,image/jpeg,image/png" required aria-label="Imagen" className="input" />
      {s.error && <p role="alert" className="text-sm text-red-400">{s.error}</p>}
      {s.url && <div><p className="label">URL (copiala)</p><input readOnly value={s.url} onFocus={(e) => e.currentTarget.select()} className="input font-mono text-xs" aria-label="URL de la imagen" /></div>}
      <button disabled={pending} className="btn-primary">{pending ? 'Subiendo…' : 'Subir'}</button>
    </form>
  )
}
