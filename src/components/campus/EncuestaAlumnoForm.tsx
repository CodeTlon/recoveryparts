'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { responderEncuestaAction } from '@/lib/actions/encuestas'
import type { ActionState } from '@/lib/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="py-3 px-6 text-sm font-semibold uppercase tracking-wide bg-accent text-white rounded transition-opacity hover:opacity-90 disabled:opacity-60">
      {pending ? 'Enviando…' : 'Enviar respuestas'}
    </button>
  )
}

export function EncuestaAlumnoForm({
  matriculaId,
  preguntas,
}: {
  matriculaId: number
  preguntas: { id: number; pregunta: string; tipo: string }[]
}) {
  const [state, formAction] = useFormState(responderEncuestaAction, {} as ActionState)
  const [ratings, setRatings] = useState<Record<number, number>>({})

  if (state.success) {
    return <p className="text-on-surface bg-surface-container-high border border-outline-variant rounded px-4 py-3">{state.success}</p>
  }

  return (
    <form action={formAction} className="space-y-5 bg-surface-container-low border border-outline-variant rounded-lg p-6">
      <input type="hidden" name="matricula_id" value={matriculaId} />
      {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {preguntas.map((p) => (
        <div key={p.id}>
          <label className="block text-sm font-medium text-on-surface mb-2">{p.pregunta}</label>
          {p.tipo === 'rating' ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRatings((r) => ({ ...r, [p.id]: n }))}
                  className={`w-10 h-10 rounded border text-sm font-semibold transition-colors ${
                    ratings[p.id] === n ? 'bg-accent text-white border-accent' : 'border-outline-variant text-on-surface-variant hover:border-secondary'
                  }`}
                >
                  {n}
                </button>
              ))}
              <input type="hidden" name={`respuesta_${p.id}`} value={ratings[p.id] ?? ''} />
            </div>
          ) : (
            <textarea name={`respuesta_${p.id}`} rows={3} className="w-full px-4 py-2.5 border border-outline-variant rounded bg-surface-container text-sm text-on-surface" />
          )}
        </div>
      ))}
      <SubmitButton />
    </form>
  )
}
