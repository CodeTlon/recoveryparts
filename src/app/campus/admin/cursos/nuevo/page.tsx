import { requireRole } from '@/lib/auth'
import CursoForm from '@/components/campus/CursoForm'
import { PageHead } from '@/components/campus/ui'

export default async function Nuevo() {
  const { sb } = await requireRole('admin')
  const [{ data: aulas }, { data: profes }] = await Promise.all([
    sb.from('aulas').select('id, nombre, capacidad').eq('activa', true).order('nombre'), // RF-03: solo aulas activas
    sb.from('profiles').select('id, nombre, apellido').eq('rol', 'profesor').neq('estado_cuenta', 'inactiva').order('apellido'),
  ])
  return (
    <>
      <PageHead title="Crear curso o taller" sub="Después de crearlo vas a poder cargar horarios, temario, kit y alumnos." />
      <CursoForm aulas={aulas ?? []} profesores={(profes ?? []).map((p) => [p.id, `${p.apellido}, ${p.nombre}`])} />
    </>
  )
}
