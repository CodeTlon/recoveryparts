import Link from 'next/link'
import type { Metadata } from 'next'
import AuthShell from '@/components/auth/AuthShell'
import { ActivarForm } from '@/components/auth/AuthForms'
import { sesionActual } from '@/lib/session'
import { perfilDeSesion } from '@/lib/users'
import { dbConfigured } from '@/lib/env'

export const metadata: Metadata = { title: 'Creá tu contraseña', robots: { index: false } }

export default async function ActivarPage() {
  const ses = dbConfigured ? await sesionActual() : null
  const user = ses ? await perfilDeSesion(ses.sub, ses.iat) : null

  if (!user) {
    return (
      <AuthShell eyebrow="Cuenta" title="El link venció" subtitle="Los links se pueden usar una sola vez y vencen.">
        <Link href="/olvide-mi-contrasena" className="btn-primary w-full">Pedir un link nuevo</Link>
      </AuthShell>
    )
  }
  return (
    <AuthShell eyebrow="Activar cuenta" title="Creá tu contraseña" subtitle="Es tu propia contraseña: nadie de la academia la conoce.">
      <ActivarForm />
    </AuthShell>
  )
}
