import { notFound } from 'next/navigation'
import { BackLink } from '@/components/campus/ui'
import { Download } from 'lucide-react'
import { requireRole } from '@/lib/auth'

// Vista previa + descarga. El PDF se sirve por /api/material/[id] (acceso validado, no-store).
export default async function Ver({ params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = await params
  const { sb } = await requireRole('alumno')
  const { data: vis } = await sb.rpc('material_visible', { p_edicion: id })
  const m = (vis as { id: string; titulo: string; tipo: string }[] | null)?.find((v) => v.id === mid && v.tipo === 'pdf')
  if (!m) notFound()

  return (
    <>
      <BackLink href={`/campus/alumno/curso/${id}`}>Volver al curso</BackLink>
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
