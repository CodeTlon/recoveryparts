import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { AREA_LABEL, TIPO_LABEL } from '@/lib/types'
import { Badge, Confirm, Empty, PageHead } from '@/components/campus/ui'
import { bajaCurso } from '../actions'

export default async function Cursos() {
  const { sb } = await requireRole('admin')
  const { data: cursos } = await sb.from('cursos').select('id, nombre, slug, area, tipo, cupo, activo, destacado, profiles(nombre, apellido), inscripciones(id)').order('activo', { ascending: false }).order('nombre')

  return (
    <>
      <PageHead title="Cursos y talleres" action={<Link href="/campus/admin/cursos/nuevo" className="btn-primary"><Plus size={16} /> Crear curso</Link>} />
      {!cursos?.length ? <Empty>Todavía no hay cursos. Creá el primero.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-on-surface-variant"><th className="px-4 py-3">Curso</th><th className="px-4 py-3">Área</th><th className="px-4 py-3">Profesor</th><th className="px-4 py-3">Inscriptos</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3" /></tr></thead>
            <tbody>
              {cursos.map((c: any) => (
                <tr key={c.id} className="border-t border-outline-variant">
                  <td className="px-4 py-3 font-medium"><Link href={`/campus/admin/cursos/${c.id}`} className="hover:text-secondary">{c.nombre}</Link> <span className="ml-1 text-xs text-on-surface-variant">{TIPO_LABEL[c.tipo as 'curso']}</span></td>
                  <td className="px-4 py-3 text-on-surface-variant">{AREA_LABEL[c.area as 'diseno']}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{c.profiles ? `${c.profiles.nombre} ${c.profiles.apellido}` : 'Sin asignar'}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{c.inscripciones.length}/{c.cupo}</td>
                  <td className="px-4 py-3"><Badge tone={c.activo ? 'ok' : 'neutral'}>{c.activo ? 'Activo' : 'De baja'}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/campus/admin/cursos/${c.id}`} className="btn-ghost !px-3 !py-2">Gestionar</Link>
                    {c.activo && <form action={bajaCurso} className="ml-2 inline"><input type="hidden" name="id" value={c.id} /><Confirm message="¿Dar de baja este curso? Dejará de verse en el sitio.">Baja</Confirm></form>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
