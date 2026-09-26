'use client'

import { Suspense } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Lock, Mail, ArrowRight } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'
import { loginAction, type ActionState } from '@/lib/actions/auth'

const gridBg: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, rgba(143,144,151,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(143,144,151,0.05) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
}

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
      {pending ? 'Ingresando…' : 'Ingresar'}
      {!pending && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
    </button>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? ''
  const initialState: ActionState = {}
  const [state, formAction] = useFormState(loginAction, initialState)

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="next" value={next} />
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
      <label className={field}>
        <Lock size={16} className="text-on-surface-variant" />
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline"
        />
      </label>
      <SubmitButton />
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface flex flex-col md:flex-row" style={gridBg}>
      {/* Panel de marca (industrial) */}
      <section className="hidden md:flex md:w-1/2 flex-col justify-between p-12 border-r border-outline-variant bg-surface-container-lowest relative overflow-hidden">
        <Image src="/images/hero.jpg" alt="" fill priority sizes="50vw" className="object-cover opacity-25" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[500px] w-[500px] rounded-full bg-accent/15 blur-[130px] pointer-events-none" />
        <Link href="/" className="relative inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-secondary transition-colors w-fit">
          <ArrowLeft size={16} /> Volver al sitio
        </Link>

        <div className="relative">
          <Image src="/images/logo.png" alt="Recovery Parts" width={120} height={120} className="w-28 h-28 mb-8" />
          <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Access_Terminal · V2.1</span>
          <h2 className="text-4xl font-bold text-primary uppercase tracking-tighter mt-2 leading-tight">{demoConfig.business.name}</h2>
          <p className="text-on-surface-variant mt-3 max-w-sm border-l-2 border-outline pl-4">
            Campus técnico de microelectrónica y reparación de precisión.
          </p>

          <div className="mt-10 flex gap-8">
            {demoConfig.content.stats.slice(0, 3).map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-on-surface tracking-tight">{s.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-on-surface-variant mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex gap-6 font-mono text-[10px] text-on-tertiary-container uppercase tracking-wider">
          <span>ESD_SAFE</span><span>·</span><span>Córdoba, AR</span><span>·</span><span>SECURE_LINK</span>
        </div>
      </section>

      {/* Formulario */}
      <section className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="md:hidden inline-flex items-center gap-2 text-sm mb-6 text-on-surface-variant hover:text-secondary transition-colors">
            <ArrowLeft size={16} /> Volver al sitio
          </Link>

          <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Login</span>
          <h1 className="text-2xl font-bold text-primary mt-1">Ingresá a tu campus</h1>
          <p className="text-sm mt-1 mb-8 text-on-surface-variant">Acceso para alumnos, profesores y administración.</p>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <p className="text-center text-xs mt-6 text-on-surface-variant">
            <Link href="/recuperar" className="hover:text-secondary transition-colors">¿Olvidaste tu contraseña?</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
