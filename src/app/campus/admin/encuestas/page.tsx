import { requireRole } from '@/lib/auth'
import { ActionForm, Badge, Empty, Field, PageHead, Select, Check } from '@/components/campus/ui'
import { guardarEncuesta } from '../actions'

type Pregunta = { tipo: 'puntaje' | 'texto'; texto: string }

export default async function Encuestas() {
  const { sb } = await requireRole('admin')
  const [{ data: encs }, { data: cursos }, { data: resp }, { data: comp }] = await Promise.all([
    sb.from('encuestas').select('*').order('creado_en', { ascending: false }),
    sb.from('cursos').select('id, nombre').eq('activo', true).order('nombre'),
    sb.from('encuesta_respuestas').select('encuesta_id, respuestas'),
    sb.from('encuesta_completadas').select('encuesta_id'),
  ])
  const opts: [string, string][] = (cursos ?? []).map((c) => [c.id, c.nombre])

  return (
    <>
      <PageHead title="Encuestas de fin de curso" sub="Las respuestas son anónimas: se guarda que el alumno respondió, pero la respuesta no tiene su identidad." />

      <details className="card mb-8 p-6"><summary className="cursor-pointer font-semibold">Crear encuesta</summary>
        <div className="mt-4 max-w-2xl"><ActionForm action={guardarEncuesta} submit="Crear encuesta">
          <Field label="Título" name="titulo" required />
          <Select name="curso_id" label="Curso" empty="Seleccioná un curso" options={opts} />
          <Field label="Preguntas" name="preguntas" rows={6} required hint='Una por línea: "puntaje | ¿Cómo calificás al profesor?" (1 a 5) o "texto | ¿Qué mejorarías?".' />
          <Check name="activa" defaultChecked>Activa (visible para los alumnos del curso)</Check>
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
                    <Field label="Título" name="titulo" defaultValue={e.titulo} required />
                    <Select name="curso_id" label="Curso" defaultValue={e.curso_id} empty="Seleccioná un curso" options={opts} />
                    <Field label="Preguntas" name="preguntas" rows={5} defaultValue={(e.preguntas as Pregunta[]).map((p) => `${p.tipo} | ${p.texto}`).join('\n')} />
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
