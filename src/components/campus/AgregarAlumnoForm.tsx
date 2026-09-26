'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { UserPlus } from 'lucide-react'
import { agregarAlumnoACursoAction } from '@/lib/actions/matriculas'
import type { ActionState } from '@/lib/actions/auth'

const fieldWrap = 'flex items-center gap-3 px-4 py-3 border border-outline-variant rounded bg-surface-container-low focus-within:border-accent transition-colors'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="py-3 px-6 text-sm font-semibold uppercase tracking-wide bg-accent text-white rounded transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shrink-0">
      <UserPlus size={16} /> {pending ? 'Agregando…' : 'Agregar alumno'}
    </button>
  )
}

export function AgregarAlumnoForm({ cursoId }: { cursoId: number }) {
  const [state, formAction] = useFormState(agregarAlumnoACursoAction, {} as ActionState)

  return (
    <form action={formAction} className="bg-surface-container-low border border-outline-variant rounded-lg p-6 space-y-3">
      <input type="hidden" name="curso_id" value={cursoId} />
      {state.error && <p role="alert" className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded px-4 py-2.5">{state.error}</p>}
      {state.success && <p className="text-sm text-on-surface bg-surface-container-high border border-outline-variant rounded px-4 py-2.5">{state.success}</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className={fieldWrap}><input name="nombre" required placeholder="Nombre" className="bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline" /></label>
        <label className={fieldWrap}><input name="apellido" required placeholder="Apellido" className="bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline" /></label>
        <label className={fieldWrap}><input type="email" name="email" required placeholder="email@ejemplo.com" className="bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline" /></label>
        <label className={fieldWrap}><input name="telefono" placeholder="Teléfono (opcional)" className="bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline" /></label>
      </div>
      <p className="text-xs text-on-surface-variant">Si el email ya tiene cuenta de alumno, se lo vincula directo a este curso sin mandarle una invitación nueva.</p>
      <SubmitButton />
    </form>
  )
}
