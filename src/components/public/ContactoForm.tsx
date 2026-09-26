'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Send } from 'lucide-react'
import { enviarConsultaAction } from '@/lib/actions/contacto'
import type { ActionState } from '@/lib/actions/auth'

const field = 'flex items-center gap-3 px-4 py-3 border border-outline-variant rounded bg-surface-container-low focus-within:border-accent transition-colors'
const inputCls = 'bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="w-full py-3.5 text-sm font-bold uppercase tracking-wide bg-accent text-white rounded transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
      {pending ? 'Enviando…' : 'Enviar consulta'} {!pending && <Send size={16} />}
    </button>
  )
}

export function ContactoForm() {
  const [state, formAction] = useFormState(enviarConsultaAction, {} as ActionState)

  if (state.success) {
    return <p className="text-on-surface bg-surface-container-high border border-outline-variant rounded px-4 py-4 text-center">{state.success}</p>
  }

  return (
    <form action={formAction} className="space-y-3">
      {/* Honeypot — oculto por CSS, no por `hidden` (algunos bots lo saltean si detectan ese atributo) */}
      <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
        <label>No completar<input name="sitio_web" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded px-4 py-2.5">{state.error}</p>}
      <label className={field}><input name="nombre" required placeholder="Tu nombre" className={inputCls} /></label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className={field}><input type="email" name="email" required placeholder="Tu email" className={inputCls} /></label>
        <label className={field}><input name="telefono" placeholder="Teléfono (opcional)" className={inputCls} /></label>
      </div>
      <label className={field}><textarea name="mensaje" required rows={4} placeholder="Contanos qué te interesa" className={inputCls} /></label>
      <SubmitButton />
    </form>
  )
}
