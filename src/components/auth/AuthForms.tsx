'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import PasswordMeter from '@/components/ui/PasswordMeter'
import { login, olvideContrasena, definirContrasena, type AuthState } from '@/app/auth/actions'

const field = 'flex items-center gap-3 rounded border border-outline-variant bg-surface-container-low px-4 py-3 transition-colors focus-within:border-accent'
const inp = 'w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60'

function Err({ s }: { s: AuthState }) {
  return s.error ? <p role="alert" className="text-sm text-red-400">{s.error}</p> : null
}

function PasswordField({ name, placeholder, label, autoComplete, minLength, value, onChange }: {
  name: string; placeholder: string; label: string; autoComplete: string; minLength?: number
  value?: string; onChange?: (v: string) => void
}) {
  const [ver, setVer] = useState(false)
  return (
    <label className={field}><Lock size={16} className="text-on-surface-variant" aria-hidden />
      <input name={name} type={ver ? 'text' : 'password'} required minLength={minLength} autoComplete={autoComplete} placeholder={placeholder} aria-label={label} className={inp}
        {...(onChange ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) } : {})} />
      <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={ver}
        className="text-on-surface-variant hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
        {ver ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
      </button>
    </label>
  )
}

export function LoginForm() {
  const [s, action, pending] = useActionState<AuthState, FormData>(login, {})
  return (
    <form action={action} className="space-y-3">
      <label className={field}><Mail size={16} className="text-on-surface-variant" aria-hidden />
        <input name="email" type="email" required autoComplete="username" placeholder="tu@email.com" aria-label="Email" className={inp} /></label>
      <PasswordField name="password" placeholder="Contraseña" label="Contraseña" autoComplete="current-password" />
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
      <PasswordField name="password" placeholder="Nueva contraseña (mín. 8)" label="Nueva contraseña" autoComplete="new-password" minLength={8} value={pw} onChange={setPw} />
      <PasswordMeter value={pw} />
      <PasswordField name="confirm" placeholder="Repetí la contraseña" label="Repetir contraseña" autoComplete="new-password" minLength={8} />
      <Err s={s} />
      <button disabled={pending} className="btn-primary w-full">{pending ? 'Guardando…' : 'Guardar y entrar'}</button>
    </form>
  )
}
