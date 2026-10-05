import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { AREA_LABEL, TIPO_LABEL } from '@/lib/types'
import { ActionForm, Badge, Confirm, Empty, ModalButton, PageHead } from '@/components/campus/ui'
import { bajaCurso, reactivarCurso } from '../actions'

export default async function Cursos() {
  const { sb } = await requireRole('admin')
  const { data: cursos } = await sb.from('cursos').select('id, nombre, slug, area, tipo, cupo, activo, destacado, profiles(nombre, apellido), inscripciones(id)').order('activo', { ascending: false }).order('nombre')

  return (
    <>
      <PageHead title="Cursos y talleres" action={<Link href="/campus/admin/cursos/nuevo" className="btn-primary"><Plus size={16} /> Crear curso</Link>} />
      {!cursos?.length ? <Empty>Todavía no hay cursos. Creá el primero.</Empty> : (
        <div className="card max-h-[70vh] overflow-auto">
          <table className="tabla w-full min-w-[720px] text-sm">
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
                    {c.activo
                      ? <form action={bajaCurso} className="ml-2 inline"><input type="hidden" name="id" value={c.id} /><Confirm message="¿Dar de baja este curso? Dejará de verse en el sitio.">Baja</Confirm></form>
                      : <span className="ml-2 inline-block">
                          <ModalButton label="Reactivar" title={`Reactivar ${c.nombre}`}>
                            <ActionForm action={reactivarCurso} submit="Reactivar" className="text-left">
                              <input type="hidden" name="id" value={c.id} />
                              <p className="text-sm text-on-surface-variant">Vuelve a verse en el sitio y en el panel del profesor. Se valida que su aula siga activa, que el cupo no supere la capacidad del aula y que no choque con otro curso en el mismo horario.</p>
                            </ActionForm>
                          </ModalButton>
                        </span>}
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
