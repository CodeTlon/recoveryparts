'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Plus, Trash2 } from 'lucide-react'
import { crearPreguntaEncuestaAction, eliminarPreguntaEncuestaAction } from '@/lib/actions/encuestas'
import type { ActionState } from '@/lib/actions/auth'

const input = 'px-3 py-2 border border-outline-variant rounded bg-surface-container text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-accent transition-colors'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="py-2.5 px-5 text-sm font-semibold uppercase tracking-wide bg-accent text-white rounded transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center gap-2 shrink-0">
      <Plus size={16} /> {pending ? 'Agregando…' : 'Agregar'}
    </button>
  )
}

export type Pregunta = { id: number; pregunta: string; tipo: string; encuesta_respuestas?: { respuesta: string }[] }

export function EncuestaManager({ cursoId, preguntas }: { cursoId: number; preguntas: Pregunta[] }) {
  const [state, formAction] = useFormState(crearPreguntaEncuestaAction, {} as ActionState)

  return (
    <div className="space-y-4">
      <form action={formAction} className="bg-surface-container-low border border-outline-variant rounded-lg p-4 md:p-6 flex flex-wrap gap-3 items-start">
        <input type="hidden" name="curso_id" value={cursoId} />
        <input name="pregunta" required placeholder="Pregunta de la encuesta" className={`${input} flex-1 min-w-[200px]`} />
        <select name="tipo" defaultValue="rating" className={input}>
          <option value="rating">Puntaje (1-5)</option>
          <option value="texto">Texto libre</option>
        </select>
        <SubmitButton />
        {state.error && <p className="text-sm text-red-400 w-full">{state.error}</p>}
      </form>

      <div className="space-y-3">
        {preguntas.map((p) => {
          const respuestas = p.encuesta_respuestas ?? []
          const promedio = p.tipo === 'rating' && respuestas.length
            ? (respuestas.reduce((acc, r) => acc + (Number(r.respuesta) || 0), 0) / respuestas.length).toFixed(1)
            : null
          return (
            <div key={p.id} className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-on-surface">{p.pregunta}</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {respuestas.length} respuesta{respuestas.length === 1 ? '' : 's'}
                    {promedio && ` · promedio ${promedio}/5`}
                  </p>
                </div>
                <form action={eliminarPreguntaEncuestaAction.bind(null, p.id, cursoId)}>
                  <button type="submit" className="text-on-surface-variant hover:text-red-400 transition-colors shrink-0"><Trash2 size={16} /></button>
                </form>
              </div>
              {p.tipo === 'texto' && respuestas.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-on-surface-variant border-t border-outline-variant pt-3">
                  {respuestas.map((r, i) => <li key={i}>&ldquo;{r.respuesta}&rdquo;</li>)}
                </ul>
              )}
            </div>
          )
        })}
        {!preguntas.length && <p className="text-on-surface-variant text-sm">Todavía no hay preguntas cargadas.</p>}
      </div>
    </div>
  )
}
