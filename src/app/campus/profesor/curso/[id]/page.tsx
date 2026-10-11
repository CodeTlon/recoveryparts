import { ClasesEditor, EstructuraEditor } from '@/components/campus/ListEditors'
import { notFound } from 'next/navigation'
import { FileText, Link2, Eye, EyeOff, Trash2, RotateCcw } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import { ActionForm, Badge, Confirm, Empty, PageHead, SubmitButton, BackLink, EstadoBadge, Check } from '@/components/campus/ui'
import { guardarClases, guardarEstructuraEdicion, restablecerEstructura } from '../../../admin/actions'
import { borrarMaterial, liberarMaterial } from '../../actions'
import MaterialForms from '@/components/campus/MaterialForms'
import { hoyAR, etiquetaEdicion, momentoEdicion } from '@/lib/fechas'
import ArbolEstructura, { type ArbolClase, type ArbolModulo } from '@/components/campus/ArbolEstructura'

// Página de una EDICIÓN que dicta el profesor (el id de la ruta es el de la edición).
export default async function EdicionProfesor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb, perfil } = await requireRole('profesor')
  const { data: ed } = await sb.from('ediciones').select('id, curso_id, fecha_inicio, activo, cursos(nombre, tipo), aulas(nombre), clases(fecha)').eq('id', id).eq('profesor_id', perfil.id).maybeSingle()
  if (!ed) notFound() // un profesor nunca ve ediciones ajenas (ni terminadas: RLS con edicion_vigente)
  // RF-04: una edición terminada o dada de baja no se abre (también lo impide la base).
  const { momento } = momentoEdicion({ activo: ed.activo, fecha_inicio: ed.fecha_inicio, fechas: ((ed.clases ?? []) as { fecha: string }[]).map((c) => c.fecha) }, hoyAR())
  if (momento !== 'en_curso' && momento !== 'proxima') notFound()
  const curso = ed.cursos as unknown as { nombre: string; tipo: string }

  // RF-58: la estructura que vale en esta edición (la guía general o la propia, si el profesor la adaptó) y su
  // material (el base del curso y el que se subió para esta edición).
  const [{ data: alumnos }, { data: mats }, { data: clases }, { data: est }, { data: hs }] = await Promise.all([
    sb.from('inscripciones').select('id, estado, profiles!inscripciones_alumno_id_fkey(nombre, apellido, email, telefono)').eq('edicion_id', id),
    sb.rpc('materiales_edicion', { p_edicion: id }),
    sb.from('clases').select('fecha, estado, plan_clase_id').eq('edicion_id', id).order('fecha'),
    sb.rpc('estructura_edicion', { p_edicion: id }),
    sb.from('horarios_curso').select('dia_semana').eq('edicion_id', id),
  ])
  const hoy = hoyAR()
  const estructura = (est ?? { personalizada: false, modulos: [], clases: [] }) as { personalizada: boolean; modulos: ArbolModulo[]; clases: ArbolClase[] }
  const liberados = new Set(((mats ?? []) as { id: string; liberado: boolean }[]).filter((m) => m.liberado).map((m) => m.id))
  const modulos = estructura.modulos
  const clasesPlan = estructura.clases
  const fechaClase = new Map((clases ?? []).map((c) => [c.plan_clase_id as string, c]))
  // Estado del material en ESTA edición (RF-32): el alumno lo ve solo si el profesor lo liberó. La fecha de la clase
  // es una referencia para el profesor; no libera nada.
  const estado = (m: { id: string; plan_clase_id: string | null }) => {
    if (liberados.has(m.id)) return { visible: true, label: 'Liberado', manual: true }
    const c = m.plan_clase_id ? fechaClase.get(m.plan_clase_id) : undefined
    if (c?.estado === 'salteada') return { visible: false, label: 'Oculto · clase salteada', manual: false }
    if (c?.estado === 'suspendida') return { visible: false, label: 'Oculto · clase suspendida', manual: false }
    if (c) return { visible: false, label: `Oculto · su clase ${c.fecha <= hoy ? 'fue' : 'es'} el ${fechaAR(c.fecha)}`, manual: false }
    return { visible: false, label: 'Oculto hasta liberarlo', manual: false }
  }
  type Mat = { id: string; tipo: 'pdf' | 'link'; titulo: string; url: string | null; plan_clase_id: string | null; base: boolean; propio: boolean }
  const filaMaterial = (m: Mat) => {
    const st = estado(m)
    return (
      <div className="flex flex-wrap items-center gap-3">
        {m.tipo === 'pdf' ? <FileText size={16} className="text-primary" /> : <Link2 size={16} className="text-primary" />}
        <span className="min-w-0 flex-1 font-medium">{m.titulo}</span>
        {m.base && <Badge>Material base</Badge>}
        <Badge tone={st.visible ? 'ok' : 'neutral'}>{st.label}</Badge>
        {m.tipo === 'pdf' && <a href={`/api/material/${m.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-2">Ver</a>}
        {(!st.visible || st.manual) && (
          <form action={liberarMaterial}>
            <input type="hidden" name="id" value={m.id} /><input type="hidden" name="edicion_id" value={id} /><input type="hidden" name="liberar" value={st.manual ? '0' : '1'} />
            <SubmitButton>{st.manual ? <><EyeOff size={14} /> Quitar liberación</> : <><Eye size={14} /> Liberar ahora</>}</SubmitButton>
          </form>
        )}
        {/* El material base (de la academia) no se borra desde acá: solo el que subió el profesor. */}
        {m.propio && (
          <form action={borrarMaterial}>
            <input type="hidden" name="id" value={m.id} />
            <Confirm message="¿Eliminar este material? Tus alumnos dejan de verlo."><Trash2 size={14} /><span className="sr-only">Eliminar</span></Confirm>
          </form>
        )}
      </div>
    )
  }

  return (
    <>
      <BackLink href="/campus/profesor">Mis cursos</BackLink>
      <PageHead title={`${curso.nombre} · ${etiquetaEdicion(ed.fecha_inicio)}`} sub={`${(ed.aulas as unknown as { nombre: string } | null)?.nombre ?? 'Aula sin asignar'} · inicia el ${fechaAR(ed.fecha_inicio)}`} />

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">Alumnos</h2>
        {!alumnos?.length ? <Empty>No hay alumnos asignados.</Empty> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-on-surface-variant"><th className="px-4 py-3">Alumno</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Teléfono</th><th className="px-4 py-3">Estado</th></tr></thead>
              <tbody>
                {alumnos.map((a: any) => (
                  <tr key={a.id} className="border-t border-outline-variant">
                    <td className="px-4 py-3 font-medium">{a.profiles?.apellido}, {a.profiles?.nombre}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{a.profiles?.email}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{a.profiles?.telefono ?? '—'}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={a.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-1 text-xl font-semibold">Material</h2>
        <p className="mb-4 text-sm text-on-surface-variant">El «material base» lo carga la academia; el resto es el que subís vos para este curso. Tus alumnos ven cada material solo cuando lo liberás con «Liberar ahora».</p>
        {!mats?.length && <Empty>Todavía no hay material cargado.</Empty>}
        <div className="mb-6"><ArbolEstructura modulos={modulos} clases={clasesPlan} materiales={(mats ?? []) as Mat[]} renderMaterial={filaMaterial} /></div>

        <MaterialForms cursoId={ed.curso_id} edicionId={id} modulos={modulos} clases={clasesPlan} />
      </section>

      <section className="mb-12">
        <h2 className="mb-1 text-xl font-semibold">Calendario</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Asigná o ajustá la fecha de cada clase: podés adelantar una clase o saltearla, o marcarla suspendida o reprogramada. El alumno solo ve el título de la clase siguiente.</p>
        <div className="max-w-4xl">
          <ActionForm action={guardarClases} reset={false}>
            <input type="hidden" name="edicion_id" value={id} />
            <ClasesEditor name="clases" plan={clasesPlan.map((p) => ({ ...p, modulo: modulos.find((m) => m.id === p.modulo_id)?.titulo }))} inicial={(clases ?? []) as { plan_clase_id: string; fecha: string; estado: string }[]} inicio={ed.fecha_inicio} dias={[...new Set((hs ?? []).map((h) => h.dia_semana as number))]}
              avisar={<Check name="avisar">Avisar por mail a los alumnos si hay clases suspendidas o reprogramadas</Check>} />
          </ActionForm>
        </div>
      </section>

      <section>
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">Estructura de tu curso</h2>
          {estructura.personalizada ? <Badge tone="warn">Personalizada para este curso</Badge> : <Badge>Sigue la guía general</Badge>}
        </div>
        <p className="mb-4 text-sm text-on-surface-variant">Podés agregar, quitar, renombrar y reordenar módulos y clases según lo necesites. Los cambios valen solo para este curso: la guía general de la academia no cambia.</p>
        <div className="max-w-4xl">
          <ActionForm action={guardarEstructuraEdicion} reset={false}>
            <input type="hidden" name="edicion_id" value={id} />
            {/* key: al personalizar o volver a la guía cambian los ids, y el editor se vuelve a montar */}
            <EstructuraEditor key={[...modulos, ...clasesPlan].map((x) => x.id).join()} name="estructura" taller={curso.tipo === 'taller'}
              inicial={{ modulos, clases: clasesPlan }}
              conMaterial={Object.fromEntries(clasesPlan.map((p) => [p.id, ((mats ?? []) as { plan_clase_id: string | null }[]).filter((m) => m.plan_clase_id === p.id).length]))} />
          </ActionForm>
          {estructura.personalizada && (
            <ActionForm action={restablecerEstructura} submit={null} className="mt-4">
              <input type="hidden" name="edicion_id" value={id} />
              <Confirm modal className="btn-ghost !px-4 !py-2" message="Se van a perder los cambios que hiciste en la estructura de este curso y va a volver a la guía general. El material que subiste a clases que ya no existan queda como material general, y las fechas de esas clases se borran.">
                <RotateCcw size={14} /> Volver a la guía general
              </Confirm>
            </ActionForm>
          )}
        </div>
      </section>
    </>
  )
}
