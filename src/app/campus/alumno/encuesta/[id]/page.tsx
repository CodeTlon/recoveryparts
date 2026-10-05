import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { ActionForm, PageHead, BackLink } from '@/components/campus/ui'
import { responderEncuesta } from '../../actions'

type Pregunta = { tipo: 'puntaje' | 'texto'; texto: string }

export default async function Encuesta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb, perfil } = await requireRole('alumno')
  const { data: e } = await sb.from('encuestas').select('id, titulo, preguntas').eq('id', id).eq('activa', true).maybeSingle()
  const { data: hecha } = await sb.from('encuesta_completadas').select('encuesta_id').eq('encuesta_id', id).eq('alumno_id', perfil.id).maybeSingle()
  if (!e) notFound()

  return (
    <>
      <BackLink href="/campus/alumno">Mis cursos</BackLink>
      <PageHead title={e.titulo} sub="Tus respuestas son anónimas: la academia no ve quién respondió qué." />
      {hecha ? <p className="card p-6 text-on-surface-variant">Ya respondiste esta encuesta. ¡Gracias!</p> : (
        <ActionForm action={responderEncuesta} submit="Enviar respuestas" className="card max-w-2xl p-6">
          <input type="hidden" name="encuesta_id" value={e.id} />
          {(e.preguntas as Pregunta[]).map((p, i) => (
            <fieldset key={i}>
              <legend className="label !normal-case !tracking-normal text-sm text-on-surface">{p.texto}</legend>
              {p.tipo === 'puntaje' ? (
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="cursor-pointer">
                      <input type="radio" name={`p_${i}`} value={n} className="peer sr-only" />
                      <span className="flex h-11 w-11 items-center justify-center rounded border border-outline-variant text-sm font-semibold peer-checked:border-accent peer-checked:bg-accent peer-checked:text-surface peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">{n}</span>
                    </label>
                  ))}
                </div>
              ) : <textarea name={`p_${i}`} rows={3} maxLength={2000} placeholder="Escribí tu respuesta…" className="input mt-2" aria-label={p.texto} />}
            </fieldset>
          ))}
        </ActionForm>
      )}
    </>
  )
}
