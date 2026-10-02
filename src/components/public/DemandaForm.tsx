'use client'

import { useActionState } from 'react'
import { registrarDemanda, type FormState } from '@/app/actions-public'

export default function DemandaForm() {
  const [s, action, pending] = useActionState<FormState, FormData>(registrarDemanda, {})
  if (s.ok) return <p className="text-sm font-semibold text-secondary">¡Gracias! Registramos tu interés.</p>
  return (
    <form action={action} className="space-y-3 text-left">
      <input name="interes" required maxLength={200} placeholder="¿Qué curso te gustaría que dictemos?" aria-label="Curso de interés" className="input" />
      <input name="contacto" maxLength={120} placeholder="Email o teléfono (opcional)" aria-label="Contacto" className="input" />
      {s.error && <p role="alert" className="text-sm text-red-400">{s.error}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? 'Enviando…' : 'Avisarme'}</button>
    </form>
  )
}
