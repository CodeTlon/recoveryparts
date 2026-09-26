'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Plus } from 'lucide-react'
import { crearEgresadoAction } from '@/lib/actions/cms'
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

export function CmsEgresadoForm() {
  const [state, formAction] = useFormState(crearEgresadoAction, {} as ActionState)
  return (
    <form action={formAction} className="bg-surface-container-low border border-outline-variant rounded-lg p-4 md:p-6 space-y-3">
      {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="nombre" required placeholder="Nombre (o nombre del grupo)" className={input} />
        <input name="especialidad" required placeholder="Especialidad (ej. Reparación de iPhone)" className={input} />
      </div>
      <input name="foto_url" required type="url" placeholder="URL de la foto" className={`${input} w-full`} />
      <div className="flex items-center gap-4">
        <input name="orden" type="number" defaultValue={0} placeholder="Orden" className={input} />
        <label className="flex items-center gap-2 text-sm text-on-surface">
          <input type="checkbox" name="destacado" /> Destacado (bloque 2x2 en la Home)
        </label>
        <SubmitButton />
      </div>
    </form>
  )
}
