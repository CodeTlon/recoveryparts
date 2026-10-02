'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { registrarDemandaAction } from '@/lib/actions/contacto'
import type { ActionState } from '@/lib/actions/auth'

const input = 'w-full px-4 py-3 border border-outline-variant rounded bg-surface-container text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-accent transition-colors'

function Enviar() {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending} className="w-full rounded bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-60">{pending ? 'Enviando…' : 'Avisarme si lo dictan'}</button>
}

export function DemandaForm() {
  const [state, action] = useFormState(registrarDemandaAction, {} as ActionState)
  if (state.success) return <p role="status" className="text-sm font-semibold text-secondary">{state.success}</p>
  return (
    <form action={action} className="mx-auto max-w-md space-y-3 text-left">
      <input name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <input name="interes" required maxLength={200} placeholder="¿Qué curso te gustaría que dictemos?" aria-label="Curso de interés" className={input} />
      <input name="contacto" maxLength={120} placeholder="Email o teléfono (opcional)" aria-label="Contacto" className={input} />
      {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      <Enviar />
    </form>
  )
}
