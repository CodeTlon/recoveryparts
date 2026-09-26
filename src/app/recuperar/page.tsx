'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { ArrowLeft, Mail, ArrowRight } from 'lucide-react'
import { recuperarSolicitarAction, type ActionState } from '@/lib/actions/auth'

const field =
  'flex items-center gap-3 px-4 py-3 border border-outline-variant rounded bg-surface-container-low focus-within:border-accent transition-colors'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 text-sm font-semibold uppercase tracking-wide bg-accent text-white rounded transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 group"
    >
      {pending ? 'Enviando…' : 'Enviar link de recuperación'}
      {!pending && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
    </button>
  )
}

export default function RecuperarPage() {
  const initialState: ActionState = {}
  const [state, formAction] = useFormState(recuperarSolicitarAction, initialState)

  return (
    <main className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm mb-6 text-on-surface-variant hover:text-secondary transition-colors">
          <ArrowLeft size={16} /> Volver a ingresar
        </Link>

        <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Recuperar acceso</span>
        <h1 className="text-2xl font-bold text-primary mt-1">Restablecé tu contraseña</h1>
        <p className="text-sm mt-1 mb-8 text-on-surface-variant">
          Ingresá el email con el que te registraste y te mandamos un link para elegir una nueva contraseña.
        </p>

        {state.success ? (
          <p className="text-sm text-on-surface bg-surface-container-low border border-outline-variant rounded px-4 py-3">
            {state.success}
          </p>
        ) : (
          <form action={formAction} className="space-y-3">
            {state.error && (
              <p role="alert" className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded px-4 py-2.5">
                {state.error}
              </p>
            )}
            <label className={field}>
              <Mail size={16} className="text-on-surface-variant" />
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="tu@email.com"
                className="bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline"
              />
            </label>
            <SubmitButton />
          </form>
        )}
      </div>
    </main>
  )
}
