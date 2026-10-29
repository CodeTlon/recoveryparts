import { Suspense } from 'react'
import { requireRole } from '@/lib/auth'
import { AREA_LABEL, type Area } from '@/lib/types'
import { PageHead, Pestanas } from '@/components/campus/ui'
import ReportesPanel from '@/components/campus/ReportesPanel'
import Skeleton from '@/components/ui/Skeleton'

// Reportes de la academia (RF-48 a RF-52). Volvieron a tener página propia: dentro del Resumen lo alargaban a varios
// metros y mezclaban lo del día con el análisis. El filtro de área va en la URL (?area=) y aplica a todos los gráficos.
export default async function Reportes({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  await requireRole('admin')
  const q = (await searchParams).area
  const area = q && q in AREA_LABEL ? (q as Area) : undefined
  return (
    <>
      <PageHead title="Reportes" sub="Inscripciones, ocupación, deserción y demanda de las ediciones activas. La ocupación es alumnos inscriptos sobre el cupo." />
      <Pestanas label="Filtrar por área" actual={area ?? 'todas'} href={(k) => (k === 'todas' ? '/campus/admin/reportes' : `/campus/admin/reportes?area=${k}`)}
        items={[['todas', 'Todas las áreas'], ...(Object.entries(AREA_LABEL) as [string, string][])]} />
      {/* Los reportes agregan varias tablas: el encabezado y el filtro se ven sin esperarlos. */}
      <Suspense key={area ?? 'todas'} fallback={<div role="status" aria-label="Cargando reportes" className="grid gap-5 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={`h-56 ${i % 3 === 0 ? 'lg:col-span-2' : ''}`} />)}</div>}>
        <ReportesPanel area={area} />
      </Suspense>
    </>
  )
}
