'use client'

// Invitación de Supabase Auth (admin.inviteUserByEmail) usa implicit flow: el
// link redirige acá con #access_token=...&refresh_token=...&type=invite en el
// FRAGMENTO de la URL, invisible server-side. Por eso esta página es
// client-only y parsea window.location.hash — ver Bug 35 de bugs.md.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ROLE_HOME: Record<string, string> = {
  alumno: '/alumno',
  profesor: '/profesor',
  administrador: '/admin',
}

const field =
  'flex items-center gap-3 px-4 py-3 border border-outline-variant rounded bg-surface-container-low focus-within:border-accent transition-colors'

type Status = 'verificando' | 'listo' | 'invalido'

export default function ActivarPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('verificando')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      setStatus('invalido')
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      // Limpiar el hash de la URL (tokens sensibles) sin recargar la página.
      window.history.replaceState(null, '', window.location.pathname)
      setStatus(error ? 'invalido' : 'listo')
    })
  }, [])

  async function activar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')
    if (password !== confirmar) return setError('Las contraseñas no coinciden')

    setGuardando(true)
    const supabase = createClient()
    const { data, error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError || !data.user) {
      setGuardando(false)
      return setError('No pudimos activar tu cuenta. Probá de nuevo.')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', data.user.id)
      .maybeSingle()

    router.replace((profile?.rol && ROLE_HOME[profile.rol]) || '/alumno')
  }

  if (status === 'verificando') {
    return (
      <main className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
        <p className="text-sm text-on-surface-variant">Verificando invitación…</p>
      </main>
    )
  }

  if (status === 'invalido') {
    return (
      <main className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-xl font-bold text-primary">Link inválido o vencido</h1>
          <p className="text-sm text-on-surface-variant">
            Pedile a la administración que te reenvíe la invitación, o si ya tenés cuenta, ingresá directamente.
          </p>
          <Link href="/login" className="inline-block text-sm font-semibold text-secondary hover:text-primary transition-colors">
            Ir a login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Activar cuenta</span>
        <h1 className="text-2xl font-bold text-primary mt-1">Elegí tu contraseña</h1>
        <p className="text-sm mt-1 mb-8 text-on-surface-variant">Último paso para activar tu acceso al campus.</p>

        <form onSubmit={activar} className="space-y-3">
          {error && (
            <p role="alert" className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded px-4 py-2.5">
              {error}
            </p>
          )}
          <label className={field}>
            <Lock size={16} className="text-on-surface-variant" />
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline"
            />
          </label>
          <label className={field}>
            <Lock size={16} className="text-on-surface-variant" />
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repetí la contraseña"
              className="bg-transparent outline-none text-sm w-full text-on-surface placeholder:text-outline"
            />
          </label>
          <button
            type="submit"
            disabled={guardando}
            className="w-full py-3 text-sm font-semibold uppercase tracking-wide bg-accent text-white rounded transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 group"
          >
            {guardando ? 'Activando…' : 'Activar cuenta'}
            {!guardando && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
      </div>
    </main>
  )
}
