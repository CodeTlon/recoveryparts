import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText, Link2, Eye, EyeOff, Trash2 } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import { ActionForm, Badge, Confirm, Empty, Field, PageHead, Select, SubmitButton, BackLink, EstadoBadge, Check } from '@/components/campus/ui'
import { guardarClases } from '../../../admin/actions'
import { agregarLink, borrarMaterial, liberarMaterial, subirPdf } from '../../actions'
import { hoyAR } from '@/lib/fechas'

export default async function CursoProfesor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb, perfil } = await requireRole('profesor')
  const { data: curso } = await sb.from('cursos').select('id, nombre, aulas(nombre)').eq('id', id).eq('profesor_id', perfil.id).maybeSingle()
  if (!curso) notFound() // un profesor nunca ve cursos ajenos

  const [{ data: alumnos }, { data: mats }, { data: clases }] = await Promise.all([
    sb.from('inscripciones').select('id, estado, profiles!inscripciones_alumno_id_fkey(nombre, apellido, email, telefono)').eq('curso_id', id),
    sb.from('materiales').select('id, tipo, titulo, url, liberado_manual, liberar_en, clase_id').eq('curso_id', id).order('creado_en'),
    sb.from('clases').select('id, numero, fecha, titulo, estado').eq('curso_id', id).order('numero'),
  ])
  const hoy = hoyAR()
  const claseOpts: [string, string][] = (clases ?? []).map((c) => [c.id, `#${c.numero} · ${c.titulo}`])
  const calendario = (clases ?? []).map((c) => `${c.numero} | ${c.fecha} | ${c.titulo} | ${c.estado}`).join('\n')

  return (
    <>
      <BackLink href="/campus/profesor">Mis cursos</BackLink>
      <PageHead title={curso.nombre} sub={(curso.aulas as any)?.nombre} />

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
        <h2 className="mb-4 text-xl font-semibold">Material</h2>
        {!mats?.length ? <Empty>Todavía no cargaste material.</Empty> : (
          <ul className="card mb-6 divide-y divide-outline-variant">
            {mats.map((m) => {
              const visible = m.liberado_manual || (m.liberar_en && m.liberar_en <= hoy)
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 p-4">
                  {m.tipo === 'pdf' ? <FileText size={18} className="text-primary" /> : <Link2 size={18} className="text-primary" />}
                  <span className="min-w-0 flex-1 font-medium">{m.titulo}</span>
                  <Badge tone={visible ? 'ok' : 'neutral'}>{visible ? 'Liberado' : m.liberar_en ? `Se libera ${fechaAR(m.liberar_en)}` : 'Oculto'}</Badge>
                  {m.tipo === 'pdf' && <a href={`/api/material/${m.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-2">Ver</a>}
                  <form action={liberarMaterial}>
                    <input type="hidden" name="id" value={m.id} /><input type="hidden" name="curso_id" value={id} /><input type="hidden" name="liberar" value={m.liberado_manual ? '0' : '1'} />
                    <SubmitButton>{m.liberado_manual ? <><EyeOff size={14} /> Ocultar</> : <><Eye size={14} /> Liberar ahora</>}</SubmitButton>
                  </form>
                  <form action={borrarMaterial}>
                    <input type="hidden" name="id" value={m.id} /><input type="hidden" name="curso_id" value={id} />
                    <Confirm message="¿Eliminar este material?" ><Trash2 size={14} /><span className="sr-only">Eliminar</span></Confirm>
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
              <input type="hidden" name="curso_id" value={id} />
              <Field label="Título" name="titulo" required />
              <Field label="Archivo (PDF, máx. 25 MB)" name="archivo" required>{(p) => <input {...p} name="archivo" type="file" accept="application/pdf" required className="input" />}</Field>
              <Select name="clase_id" label="Clase (opcional)" empty="Material general" options={claseOpts} />
              <Field label="Liberar automáticamente el" name="liberar_en" type="date" hint="Vacío = queda oculto hasta que lo liberes a mano." />
            </ActionForm>
          </div>
          <div className="card p-6">
            <h3 className="mb-4 font-semibold">Agregar link (video, Drive…)</h3>
            <ActionForm action={agregarLink} submit="Agregar link">
              <input type="hidden" name="curso_id" value={id} />
              <Field label="Título" name="titulo" required />
              <Field label="Link" name="url" type="url" required placeholder="https://" hint="Subí los videos a YouTube (no listado) o Drive. No se alojan videos." />
              <Select name="clase_id" label="Clase (opcional)" empty="Material general" options={claseOpts} />
              <Field label="Liberar automáticamente el" name="liberar_en" type="date" />
            </ActionForm>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">Temario y calendario</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Cargá de antemano todas las clases. El alumno solo ve el título de la clase siguiente.</p>
        <div className="card max-w-3xl p-6">
          <ActionForm action={guardarClases} reset={false}>
            <input type="hidden" name="curso_id" value={id} />
            <Field label="Clases" name="clases" rows={10} defaultValue={calendario} hint='Una por línea: "N | AAAA-MM-DD | Título | programada|suspendida|reprogramada".' />
            <Check name="avisar">Avisar por mail a los alumnos si hay clases suspendidas o reprogramadas</Check>
          </ActionForm>
        </div>
      </section>
    </>
  )
}
