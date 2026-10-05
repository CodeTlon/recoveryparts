import { requireRole } from '@/lib/auth'
import CursoForm from '@/components/campus/CursoForm'
import { PageHead } from '@/components/campus/ui'

export default async function Nuevo() {
  await requireRole('admin')
  return (
    <>
      <PageHead title="Crear curso o taller" sub="Primero el contenido (se carga una vez). Después vas a cargar el plan de clases y crear la primera edición con su fecha, aula, profesor y cupo." />
      <CursoForm />
    </>
  )
}
