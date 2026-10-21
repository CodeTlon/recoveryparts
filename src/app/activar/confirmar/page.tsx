import Link from 'next/link'
import type { Metadata } from 'next'
import AuthShell from '@/components/auth/AuthShell'
import { confirmarAcceso } from '@/app/auth/actions'

export const metadata: Metadata = { title: 'Confirmar acceso', robots: { index: false } }

// Paso intermedio del link del mail: el token solo se consume al apretar el botón (POST), no al abrir la página.
export default async function ConfirmarPage({ searchParams }: { searchParams: Promise<{ token?: string; type?: string }> }) {
  const { token, type } = await searchParams
  if (!token || (type !== 'invite' && type !== 'recovery')) {
    return (
      <AuthShell eyebrow="Cuenta" title="El link venció" subtitle="Los links se pueden usar una sola vez y vencen.">
        <Link href="/olvide-mi-contrasena" className="btn-primary w-full">Pedir un link nuevo</Link>
      </AuthShell>
    )
  }
  return (
    <AuthShell eyebrow="Cuenta" title={type === 'invite' ? 'Activá tu cuenta' : 'Recuperá tu acceso'} subtitle="Confirmá para crear tu contraseña.">
      <form action={confirmarAcceso}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="type" value={type} />
        <button type="submit" className="btn-primary w-full">Continuar</button>
      </form>
    </AuthShell>
  )
}
