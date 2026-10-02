'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import PasswordMeter from '@/components/ui/PasswordMeter'
import { login, olvideContrasena, definirContrasena, type AuthState } from '@/app/auth/actions'

const field = 'flex items-center gap-3 rounded border border-outline-variant bg-surface-container-low px-4 py-3 transition-colors focus-within:border-accent'
const inp = 'w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60'

function Err({ s }: { s: AuthState }) {
  return s.error ? <p role="alert" className="text-sm text-red-400">{s.error}</p> : null
}

export function LoginForm() {
  const [s, action, pending] = useActionState<AuthState, FormData>(login, {})
  return (
    <form action={action} className="space-y-3">
      <label className={field}><Mail size={16} className="text-on-surface-variant" aria-hidden />
        <input name="email" type="email" required autoComplete="username" placeholder="tu@email.com" aria-label="Email" className={inp} /></label>
      <label className={field}><Lock size={16} className="text-on-surface-variant" aria-hidden />
        <input name="password" type="password" required autoComplete="current-password" placeholder="Contraseña" aria-label="Contraseña" className={inp} /></label>
      <Err s={s} />
      <button disabled={pending} className="btn-primary w-full">{pending ? 'Ingresando…' : <>Ingresar <ArrowRight size={16} /></>}</button>
      <p className="text-center text-sm"><Link href="/olvide-mi-contrasena" className="text-on-surface-variant hover:text-secondary">¿Olvidaste tu contraseña?</Link></p>
    </form>
  )
}

export function OlvideForm() {
  const [s, action, pending] = useActionState<AuthState, FormData>(olvideContrasena, {})
  if (s.ok) return <p role="status" className="card p-4 text-sm text-on-surface-variant">Si el email existe, te enviamos un link para crear tu contraseña. El link vence en 10 minutos.</p>
  return (
    <form action={action} className="space-y-3">
      <label className={field}><Mail size={16} className="text-on-surface-variant" aria-hidden />
        <input name="email" type="email" required placeholder="tu@email.com" aria-label="Email" className={inp} /></label>
      <Err s={s} />
      <button disabled={pending} className="btn-primary w-full">{pending ? 'Enviando…' : 'Enviar link'}</button>
    </form>
  )
}

export function ActivarForm() {
  const [s, action, pending] = useActionState<AuthState, FormData>(definirContrasena, {})
  const [pw, setPw] = useState('')
  return (
    <form action={action} className="space-y-3">
      <label className={field}><Lock size={16} className="text-on-surface-variant" aria-hidden />
        <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Nueva contraseña (mín. 8)" aria-label="Nueva contraseña" className={inp} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      <PasswordMeter value={pw} />
      <label className={field}><Lock size={16} className="text-on-surface-variant" aria-hidden />
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="Repetí la contraseña" aria-label="Repetir contraseña" className={inp} /></label>
      <Err s={s} />
      <button disabled={pending} className="btn-primary w-full">{pending ? 'Guardando…' : 'Guardar y entrar'}</button>
    </form>
  )
}
