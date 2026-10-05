import { requireRole } from '@/lib/auth'
import { etiquetaEdicion } from '@/lib/fechas'
import { ActionForm, Badge, Empty, Field, PageHead, Select, Check } from '@/components/campus/ui'
import { guardarEncuesta } from '../actions'

type Pregunta = { tipo: 'puntaje' | 'texto'; texto: string }

export default async function Encuestas() {
  const { sb } = await requireRole('admin')
  const [{ data: encs }, { data: cursos }, { data: resp }, { data: comp }] = await Promise.all([
    sb.from('encuestas').select('*').order('creado_en', { ascending: false }),
    sb.from('ediciones').select('id, fecha_inicio, activo, cursos(nombre, activo)').order('fecha_inicio', { ascending: false }),
    sb.from('encuesta_respuestas').select('encuesta_id, respuestas'),
    sb.from('encuesta_completadas').select('encuesta_id'),
  ])
  // La encuesta es por edición (D5): cada grupo responde la suya. Se ofrecen las ediciones activas de cursos activos.
  type Ed = { id: string; fecha_inicio: string | null; activo: boolean; cursos: { nombre: string; activo: boolean } | null }
  const eds = (cursos ?? []) as unknown as Ed[]
  const etiqueta = (e?: Ed) => (e ? `${e.cursos?.nombre ?? 'Curso'} · ${etiquetaEdicion(e.fecha_inicio)}` : 'Edición dada de baja')
  const opts: [string, string][] = eds.filter((e) => e.activo && e.cursos?.activo).sort((a, b) => etiqueta(a).localeCompare(etiqueta(b))).map((e) => [e.id, etiqueta(e)])

  return (
    <>
      <PageHead title="Encuestas de fin de curso" sub="Las respuestas son anónimas: se guarda que el alumno respondió, pero la respuesta no tiene su identidad." />

      <details className="card mb-8 p-6"><summary className="cursor-pointer font-semibold">Crear encuesta</summary>
        <div className="mt-4 max-w-2xl"><ActionForm action={guardarEncuesta} submit="Crear encuesta">
          <Field label="Título" name="titulo" placeholder="Ej: Encuesta de fin de curso" required />
          <Select name="edicion_id" label="Edición" empty="Seleccioná una edición" options={opts} />
          <Field label="Preguntas" name="preguntas" placeholder={'puntaje | ¿Cómo calificás al profesor?\ntexto | ¿Qué mejorarías?'} rows={6} required hint='Una por línea: "puntaje | ¿Cómo calificás al profesor?" (1 a 5) o "texto | ¿Qué mejorarías?".' />
          <Check name="activa" defaultChecked>Activa (visible para los alumnos de la edición)</Check>
        </ActionForm></div>
      </details>

      {!encs?.length ? <Empty>No hay encuestas.</Empty> : (
        <div className="space-y-6">
          {encs.map((e) => {
            const rs = (resp ?? []).filter((r) => r.encuesta_id === e.id).map((r) => r.respuestas as Record<string, string>)
            const hechas = (comp ?? []).filter((c) => c.encuesta_id === e.id).length
            return (
              <article key={e.id} className="card p-6">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold">{e.titulo}</h2>
                  <span className="text-sm text-on-surface-variant">{etiqueta(eds.find((x) => x.id === e.edicion_id))}</span>
                  <Badge tone={e.activa ? 'ok' : 'neutral'}>{e.activa ? 'Activa' : 'Inactiva'}</Badge>
                  <span className="ml-auto text-sm text-on-surface-variant">{hechas} respuesta{hechas === 1 ? '' : 's'}</span>
                </div>
                <ul className="space-y-3 text-sm">
                  {(e.preguntas as Pregunta[]).map((p, i) => {
                    const vals = rs.map((r) => r[String(i)]).filter(Boolean)
                    const prom = p.tipo === 'puntaje' && vals.length ? (vals.reduce((s, v) => s + Number(v), 0) / vals.length).toFixed(1) : null
                    return (
                      <li key={i}>
                        <p className="font-medium">{p.texto} {prom && <span className="ml-2 text-accent">promedio {prom}/5</span>}</p>
                        {p.tipo === 'texto' && vals.length > 0 && <ul className="mt-1 list-disc pl-5 text-on-surface-variant">{vals.map((v, k) => <li key={k}>{v}</li>)}</ul>}
                      </li>
                    )
                  })}
                </ul>
                <details className="mt-4"><summary className="cursor-pointer text-sm text-secondary">Editar</summary>
                  <div className="mt-3 max-w-2xl"><ActionForm action={guardarEncuesta} reset={false}>
                    <input type="hidden" name="id" value={e.id} />
                    <Field label="Título" name="titulo" placeholder="Ej: Encuesta de fin de curso" defaultValue={e.titulo} required />
                    <Select name="edicion_id" label="Edición" defaultValue={e.edicion_id} empty="Seleccioná una edición" options={opts} />
                    <Field label="Preguntas" name="preguntas" placeholder={'puntaje | ¿Cómo calificás al profesor?\ntexto | ¿Qué mejorarías?'} rows={5} defaultValue={(e.preguntas as Pregunta[]).map((p) => `${p.tipo} | ${p.texto}`).join('\n')} />
                    <Check name="activa" defaultChecked={e.activa}>Activa</Check>
                  </ActionForm></div>
                </details>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
