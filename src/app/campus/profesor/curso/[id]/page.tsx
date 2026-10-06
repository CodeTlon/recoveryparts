import { ClasesEditor, EstructuraEditor } from '@/components/campus/ListEditors'
import { notFound } from 'next/navigation'
import { FileText, Link2, Eye, EyeOff, Trash2 } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import { ActionForm, Badge, Confirm, Empty, Field, FileField, PageHead, Select, SubmitButton, BackLink, EstadoBadge, Check } from '@/components/campus/ui'
import { guardarClases, guardarEstructura } from '../../../admin/actions'
import { agregarLink, borrarMaterial, liberarMaterial, subirPdf } from '../../actions'
import { hoyAR, etiquetaEdicion } from '@/lib/fechas'
import ArbolEstructura, { TIPO_CLASE, type ArbolClase, type ArbolModulo } from '@/components/campus/ArbolEstructura'

// Página de una EDICIÓN que dicta el profesor (el id de la ruta es el de la edición).
export default async function EdicionProfesor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb, perfil } = await requireRole('profesor')
  const { data: ed } = await sb.from('ediciones').select('id, curso_id, fecha_inicio, cursos(nombre, tipo), aulas(nombre)').eq('id', id).eq('profesor_id', perfil.id).maybeSingle()
  if (!ed) notFound() // un profesor nunca ve ediciones ajenas
  const curso = ed.cursos as unknown as { nombre: string; tipo: string }

  const [{ data: alumnos }, { data: mats }, { data: libs }, { data: clases }, { data: plan }, { data: hs }, { data: mods }] = await Promise.all([
    sb.from('inscripciones').select('id, estado, profiles!inscripciones_alumno_id_fkey(nombre, apellido, email, telefono)').eq('edicion_id', id),
    sb.from('materiales').select('id, tipo, titulo, url, plan_clase_id').eq('curso_id', ed.curso_id).order('creado_en'),
    sb.from('materiales_liberados').select('material_id').eq('edicion_id', id),
    sb.from('clases').select('numero, fecha, estado, plan_clase_id').eq('edicion_id', id).order('numero'),
    sb.from('plan_clases').select('id, numero, titulo, tipo, modulo_id').eq('curso_id', ed.curso_id).order('numero'),
    sb.from('horarios_curso').select('dia_semana').eq('edicion_id', id),
    sb.from('modulos_curso').select('id, titulo, orden').eq('curso_id', ed.curso_id).order('orden'),
  ])
  const hoy = hoyAR()
  const liberados = new Set((libs ?? []).map((l) => l.material_id))
  const modulos = (mods ?? []) as ArbolModulo[]
  const clasesPlan = (plan ?? []) as ArbolClase[]
  const fechaClase = new Map((clases ?? []).map((c) => [c.plan_clase_id as string, c]))
  // Selector de clase agrupado por módulo (en talleres, sin grupos).
  const opcion = (p: ArbolClase): [string, string] => [p.id, `${p.numero}. ${p.titulo} · ${TIPO_CLASE[p.tipo]}`]
  const claseOpts: [string, string][] = clasesPlan.filter((p) => !modulos.some((m) => m.id === p.modulo_id)).map(opcion)
  const claseGrupos: [string, [string, string][]][] = modulos.map((m, i) => [`Módulo ${i + 1} · ${m.titulo}`, clasesPlan.filter((p) => p.modulo_id === m.id).map(opcion)])
  // Estado del material en ESTA edición: liberado a mano, liberado porque llegó su clase, programado u oculto.
  // Una clase salteada o suspendida no libera su material sola (se libera a mano).
  const estado = (m: { id: string; plan_clase_id: string | null }) => {
    if (liberados.has(m.id)) return { visible: true, label: 'Liberado en esta edición', manual: true }
    const c = m.plan_clase_id ? fechaClase.get(m.plan_clase_id) : undefined
    if (c?.estado === 'salteada') return { visible: false, label: 'Clase salteada: liberalo a mano', manual: false }
    if (c && c.estado !== 'suspendida' && c.fecha <= hoy) return { visible: true, label: 'Liberado (llegó su clase)', manual: false }
    if (c && c.estado !== 'suspendida') return { visible: false, label: `Se libera el ${fechaAR(c.fecha)}`, manual: false }
    return { visible: false, label: c ? 'Clase suspendida' : m.plan_clase_id ? 'Su clase no tiene fecha' : 'Oculto hasta liberarlo', manual: false }
  }
  type Mat = { id: string; tipo: 'pdf' | 'link'; titulo: string; url: string | null; plan_clase_id: string | null }
  const filaMaterial = (m: Mat) => {
    const st = estado(m)
    return (
      <div className="flex flex-wrap items-center gap-3">
        {m.tipo === 'pdf' ? <FileText size={16} className="text-primary" /> : <Link2 size={16} className="text-primary" />}
        <span className="min-w-0 flex-1 font-medium">{m.titulo}</span>
        <Badge tone={st.visible ? 'ok' : 'neutral'}>{st.label}</Badge>
        {m.tipo === 'pdf' && <a href={`/api/material/${m.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-2">Ver</a>}
        {(!st.visible || st.manual) && (
          <form action={liberarMaterial}>
            <input type="hidden" name="id" value={m.id} /><input type="hidden" name="edicion_id" value={id} /><input type="hidden" name="liberar" value={st.manual ? '0' : '1'} />
            <SubmitButton>{st.manual ? <><EyeOff size={14} /> Quitar liberación</> : <><Eye size={14} /> Liberar ahora</>}</SubmitButton>
          </form>
        )}
        <form action={borrarMaterial}>
          <input type="hidden" name="id" value={m.id} />
          <Confirm message="¿Eliminar este material? Deja de verse en todas las ediciones del curso."><Trash2 size={14} /><span className="sr-only">Eliminar</span></Confirm>
        </form>
      </div>
    )
  }

  return (
    <>
      <BackLink href="/campus/profesor">Mis ediciones</BackLink>
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
        <h2 className="mb-1 text-xl font-semibold">Material del curso</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Es el mismo en todas las ediciones. En esta edición se libera solo cuando llega la fecha de su clase; con «Liberar ahora» lo adelantás solo acá.</p>
        {!mats?.length && <Empty>Todavía no hay material cargado.</Empty>}
        <div className="mb-6"><ArbolEstructura modulos={modulos} clases={clasesPlan} materiales={(mats ?? []) as Mat[]} renderMaterial={filaMaterial} /></div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="mb-4 font-semibold">Subir PDF</h3>
            <ActionForm action={subirPdf} submit="Subir PDF">
              <input type="hidden" name="curso_id" value={ed.curso_id} /><input type="hidden" name="edicion_id" value={id} />
              <Field label="Título" name="titulo" placeholder="Ej: Apunte de la clase 1" required />
              <FileField label="Archivo (PDF, máx. 25 MB)" name="archivo" accept="application/pdf" required />
              <Select name="plan_clase_id" label="Clase" empty="Material general (se libera a mano)" options={claseOpts} grupos={claseGrupos} />
              <Check name="liberar_ya">Liberarlo ya en esta edición</Check>
            </ActionForm>
          </div>
          <div className="card p-6">
            <h3 className="mb-4 font-semibold">Agregar link (video, Drive…)</h3>
            <ActionForm action={agregarLink} submit="Agregar link">
              <input type="hidden" name="curso_id" value={ed.curso_id} /><input type="hidden" name="edicion_id" value={id} />
              <Field label="Título" name="titulo" placeholder="Ej: Video de la clase 1" required />
              <Field label="Link" name="url" type="url" required placeholder="https://" hint="Subí los videos a YouTube (no listado) o Drive. No se alojan videos." />
              <Select name="plan_clase_id" label="Clase" empty="Material general (se libera a mano)" options={claseOpts} grupos={claseGrupos} />
              <Check name="liberar_ya">Liberarlo ya en esta edición</Check>
            </ActionForm>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-1 text-xl font-semibold">Calendario de esta edición</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Asigná o ajustá la fecha de cada clase, o marcá una clase como suspendida o reprogramada. El alumno solo ve el título de la clase siguiente.</p>
        <div className="card max-w-4xl p-6">
          <ActionForm action={guardarClases} reset={false}>
            <input type="hidden" name="edicion_id" value={id} />
            <ClasesEditor name="clases" plan={plan ?? []} inicial={clases ?? []} inicio={ed.fecha_inicio} dias={[...new Set((hs ?? []).map((h) => h.dia_semana as number))]}
              avisar={<Check name="avisar">Avisar por mail a los alumnos si hay clases suspendidas o reprogramadas</Check>} />
          </ActionForm>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">Estructura del curso</h2>
        <p className="mb-4 text-sm text-secondary">Ojo: la estructura (módulos y clases) es del curso y la comparten todas sus ediciones. Cambiar un título lo cambia en todas.</p>
        <div className="card max-w-3xl p-6">
          <ActionForm action={guardarEstructura} reset={false}>
            <input type="hidden" name="curso_id" value={ed.curso_id} />
            {/* key: tras guardar se vuelve a montar con los ids nuevos */}
            <EstructuraEditor key={[...modulos, ...clasesPlan].map((x) => x.id).join()} name="estructura" taller={curso.tipo === 'taller'}
              inicial={{ modulos, clases: clasesPlan }}
              conMaterial={Object.fromEntries(clasesPlan.map((p) => [p.id, (mats ?? []).filter((m) => m.plan_clase_id === p.id).length]))} />
          </ActionForm>
        </div>
      </section>
    </>
  )
}
