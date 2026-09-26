'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Plus } from 'lucide-react'
import { crearFotoGaleriaAction } from '@/lib/actions/cms'
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

export function CmsFotoForm() {
  const [state, formAction] = useFormState(crearFotoGaleriaAction, {} as ActionState)
  return (
    <form action={formAction} className="bg-surface-container-low border border-outline-variant rounded-lg p-4 md:p-6 space-y-3">
      {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      <input name="url" required type="url" placeholder="URL de la imagen (https://…)" className={`${input} w-full`} />
      <div className="grid sm:grid-cols-3 gap-3">
        <select name="categoria" defaultValue="clases" className={input}>
          <option value="aulas">Aulas</option>
          <option value="clases">Clases en acción</option>
          <option value="trabajos_alumnos">Trabajos de alumnos</option>
          <option value="egresados">Egresados</option>
          <option value="eventos">Eventos</option>
        </select>
        <input name="alt" required placeholder="Texto alternativo (a11y/SEO)" className={input} />
        <input name="orden" type="number" defaultValue={0} placeholder="Orden" className={input} />
      </div>
      <input name="descripcion" placeholder="Descripción (opcional)" className={`${input} w-full`} />
      <SubmitButton />
    </form>
  )
}
