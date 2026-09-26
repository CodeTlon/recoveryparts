'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Plus } from 'lucide-react'
import { crearTestimonioAction } from '@/lib/actions/cms'
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

export function CmsTestimonioForm({ cursos }: { cursos: { id: number; titulo: string }[] }) {
  const [state, formAction] = useFormState(crearTestimonioAction, {} as ActionState)
  return (
    <form action={formAction} className="bg-surface-container-low border border-outline-variant rounded-lg p-4 md:p-6 space-y-3">
      {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      <div className="grid sm:grid-cols-3 gap-3">
        <input name="nombre" required placeholder="Nombre" className={input} />
        <select name="curso_id" defaultValue="" className={input}>
          <option value="">Sin curso asociado</option>
          {cursos.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
        </select>
        <select name="puntaje" defaultValue="5" className={input}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ⭐</option>)}
        </select>
      </div>
      <textarea name="comentario" required rows={2} placeholder="Comentario del alumno" className={`${input} w-full`} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="foto_url" placeholder="URL de la foto (opcional)" className={input} />
        <input name="orden" type="number" defaultValue={0} placeholder="Orden" className={input} />
      </div>
      <SubmitButton />
    </form>
  )
}
