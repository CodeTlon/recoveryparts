import { Suspense } from 'react'
import { requireRole } from '@/lib/auth'
import { PageHead } from '@/components/campus/ui'
import ReportesPanel from '@/components/campus/ReportesPanel'
import Skeleton from '@/components/ui/Skeleton'

// Reportes de la academia (RF-48 a RF-52). Volvieron a tener página propia: dentro del Resumen lo alargaban a varios
// metros y mezclaban lo del día con el análisis.
export default async function Reportes() {
  await requireRole('admin')
  return (
    <>
      <PageHead title="Reportes" sub="Ocupación, deserción y demanda. La ocupación es alumnos inscriptos sobre el cupo (los pagos no se manejan acá)." />
      {/* Los reportes agregan varias tablas: el encabezado se ve sin esperarlos. */}
      <Suspense fallback={<div role="status" aria-label="Cargando reportes" className="grid gap-6 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56" />)}</div>}>
        <ReportesPanel />
      </Suspense>
    </>
  )
}
