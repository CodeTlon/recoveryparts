'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Lock, ArrowRight } from 'lucide-react'
import { recuperarActualizarAction, type ActionState } from '@/lib/actions/auth'

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
      {pending ? 'Guardando…' : 'Guardar contraseña'}
      {!pending && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
    </button>
  )
}

export default function NuevaClavePage() {
  const initialState: ActionState = {}
  const [state, formAction] = useFormState(recuperarActualizarAction, initialState)

  return (
    <main className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Recuperar acceso</span>
        <h1 className="text-2xl font-bold text-primary mt-1">Elegí tu nueva contraseña</h1>
        <p className="text-sm mt-1 mb-8 text-on-surface-variant">Mínimo 8 caracteres.</p>

        <form action={formAction} className="space-y-3">
          {state.error && (
            <p role="alert" className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded px-4 py-2.5">
              {state.error}
            </p>
          )}
          <label className={field}>
            <Lock size={16} className="text-on-surface-variant" />
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Nueva contraseña"
              className="bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline"
            />
          </label>
          <label className={field}>
            <Lock size={16} className="text-on-surface-variant" />
            <input
              type="password"
              name="confirmar"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Repetí la contraseña"
              className="bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline"
            />
          </label>
          <SubmitButton />
        </form>
      </div>
    </main>
  )
}
