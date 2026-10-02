import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { requireRole } from '@/lib/auth'

// Vista previa + descarga. El PDF se sirve por /api/material/[id] (acceso validado, no-store).
export default async function Ver({ params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = await params
  const { sb } = await requireRole('alumno')
  const { data: vis } = await sb.rpc('material_visible', { p_curso: id })
  const m = (vis as { id: string; titulo: string; tipo: string }[] | null)?.find((v) => v.id === mid && v.tipo === 'pdf')
  if (!m) notFound()

  return (
    <>
      <Link href={`/campus/alumno/curso/${id}`} className="mb-4 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-secondary"><ArrowLeft size={16} /> Volver al curso</Link>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">{m.titulo}</h1>
        <a href={`/api/material/${mid}?download=1`} className="btn-primary"><Download size={16} /> Descargar PDF</a>
      </div>
      <div>
        <iframe src={`/api/material/${mid}#navpanes=0`} title={m.titulo} className="h-[78vh] w-full rounded border border-outline-variant bg-white" />
      </div>
    </>
  )
}
