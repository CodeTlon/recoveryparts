import { ClasesEditor, EstructuraEditor, type TipoClase } from '@/components/campus/ListEditors'
import { notFound } from 'next/navigation'
import { FileText, Link2, Eye, EyeOff, Trash2 } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import { ActionForm, Badge, Confirm, Empty, Field, FileField, PageHead, Select, SubmitButton, BackLink, EstadoBadge, Check } from '@/components/campus/ui'
import { guardarClases, guardarEstructura } from '../../../admin/actions'
import { agregarLink, borrarMaterial, liberarMaterial, subirPdf } from '../../actions'
import { hoyAR, etiquetaEdicion } from '@/lib/fechas'

// Página de una EDICIÓN que dicta el profesor (el id de la ruta es el de la edición).
export default async function EdicionProfesor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb, perfil } = await requireRole('profesor')
  const { data: ed } = await sb.from('ediciones').select('id, curso_id, fecha_inicio, cursos(nombre, tipo), aulas(nombre)').eq('id', id).eq('profesor_id', perfil.id).maybeSingle()
  if (!ed) notFound() // un profesor nunca ve ediciones ajenas
  const curso = ed.cursos as unknown as { nombre: string; tipo: string }

  const [{ data: alumnos }, { data: mats }, { data: libs }, { data: clases }, { data: plan }, { data: hs }, { data: mods }] = await Promise.all([
    sb.from('inscripciones').select('id, estado, profiles!inscripciones_alumno_id_fkey(nombre, apellido, email, telefono)').eq('edicion_id', id),
    sb.from('materiales').select('id, tipo, titulo, url, clase_numero, plan_clase_id').eq('curso_id', ed.curso_id).order('clase_numero', { nullsFirst: true }).order('creado_en'),
    sb.from('materiales_liberados').select('material_id').eq('edicion_id', id),
    sb.from('clases').select('numero, fecha, estado').eq('edicion_id', id).order('numero'),
    sb.from('plan_clases').select('id, numero, titulo, tipo, modulo_id').eq('curso_id', ed.curso_id).order('numero'),
    sb.from('horarios_curso').select('dia_semana').eq('edicion_id', id),
    sb.from('modulos_curso').select('id, titulo').eq('curso_id', ed.curso_id).order('orden'),
  ])
  const hoy = hoyAR()
  const liberados = new Set((libs ?? []).map((l) => l.material_id))
  const fechaClase = new Map((clases ?? []).map((c) => [c.numero, c]))
  const claseOpts: [string, string][] = (plan ?? []).map((p) => [String(p.numero), `#${p.numero} · ${p.titulo}`])
  // Estado del material en ESTA edición: liberado a mano, liberado porque llegó su clase, programado u oculto.
  const estado = (m: { id: string; clase_numero: number | null }) => {
    if (liberados.has(m.id)) return { visible: true, label: 'Liberado en esta edición', manual: true }
    const c = m.clase_numero != null ? fechaClase.get(m.clase_numero) : undefined
    if (c && c.estado !== 'suspendida' && c.fecha <= hoy) return { visible: true, label: `Liberado (clase ${m.clase_numero})`, manual: false }
    if (c) return { visible: false, label: `Se libera el ${fechaAR(c.fecha)}`, manual: false }
    return { visible: false, label: m.clase_numero != null ? 'Su clase no tiene fecha' : 'Oculto hasta liberarlo', manual: false }
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
        {!mats?.length ? <Empty>Todavía no hay material cargado.</Empty> : (
          <ul className="card mb-6 divide-y divide-outline-variant">
            {mats.map((m) => {
              const st = estado(m)
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 p-4">
                  {m.tipo === 'pdf' ? <FileText size={18} className="text-primary" /> : <Link2 size={18} className="text-primary" />}
                  <span className="min-w-0 flex-1"><span className="font-medium">{m.titulo}</span><span className="block text-xs text-on-surface-variant">{m.clase_numero ? `Clase ${m.clase_numero} · ${plan?.find((p) => p.numero === m.clase_numero)?.titulo ?? ''}` : 'Material general'}</span></span>
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
                </li>
              )
            })}
          </ul>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="mb-4 font-semibold">Subir PDF</h3>
            <ActionForm action={subirPdf} submit="Subir PDF">
              <input type="hidden" name="curso_id" value={ed.curso_id} /><input type="hidden" name="edicion_id" value={id} />
              <Field label="Título" name="titulo" placeholder="Ej: Apunte de la clase 1" required />
              <FileField label="Archivo (PDF, máx. 25 MB)" name="archivo" accept="application/pdf" required />
              <Select name="clase_numero" label="Clase" empty="Material general (se libera a mano)" options={claseOpts} />
              <Check name="liberar_ya">Liberarlo ya en esta edición</Check>
            </ActionForm>
          </div>
          <div className="card p-6">
            <h3 className="mb-4 font-semibold">Agregar link (video, Drive…)</h3>
            <ActionForm action={agregarLink} submit="Agregar link">
              <input type="hidden" name="curso_id" value={ed.curso_id} /><input type="hidden" name="edicion_id" value={id} />
              <Field label="Título" name="titulo" placeholder="Ej: Video de la clase 1" required />
              <Field label="Link" name="url" type="url" required placeholder="https://" hint="Subí los videos a YouTube (no listado) o Drive. No se alojan videos." />
              <Select name="clase_numero" label="Clase" empty="Material general (se libera a mano)" options={claseOpts} />
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
            <EstructuraEditor key={[...(mods ?? []), ...(plan ?? [])].map((x) => x.id).join()} name="estructura" taller={curso.tipo === 'taller'}
              inicial={{ modulos: mods ?? [], clases: (plan ?? []).map((p) => ({ ...p, tipo: p.tipo as TipoClase })) }}
              conMaterial={Object.fromEntries((plan ?? []).map((p) => [p.id, (mats ?? []).filter((m) => m.plan_clase_id === p.id).length]))} />
          </ActionForm>
        </div>
      </section>
    </>
  )
}
