'use client'

import { useActionState } from 'react'
import { enviarContacto, type FormState } from '@/app/actions-public'

export default function ContactForm() {
  const [s, action, pending] = useActionState<FormState, FormData>(enviarContacto, {})
  if (s.ok) return <p role="status" className="card p-6 font-semibold text-secondary">¡Gracias! Recibimos tu consulta y te vamos a responder a la brevedad.</p>
  return (
    <form action={action} className="card space-y-4 p-6">
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div><label className="label" htmlFor="c-nombre">Nombre</label><input id="c-nombre" name="nombre" required maxLength={120} className="input" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" required className="input" /></div>
        <div><label className="label" htmlFor="c-tel">Teléfono (opcional)</label><input id="c-tel" name="telefono" type="tel" className="input" /></div>
      </div>
      <div><label className="label" htmlFor="c-msg">Consulta</label><textarea id="c-msg" name="mensaje" required rows={4} maxLength={4000} className="input" /></div>
      <p className="text-xs text-on-surface-variant">Usamos tus datos únicamente para responder tu consulta (Ley 25.326). Podés pedir acceso o rectificación escribiéndonos.</p>
      {s.error && <p role="alert" className="text-sm text-red-400">{s.error}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? 'Enviando…' : 'Enviar consulta'}</button>
    </form>
  )
}
