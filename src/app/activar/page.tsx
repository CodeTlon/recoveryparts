import Link from 'next/link'
import type { Metadata } from 'next'
import AuthShell from '@/components/auth/AuthShell'
import { ActivarForm } from '@/components/auth/AuthForms'
import { sesionActivacion } from '@/lib/session'
import { perfilDeSesion } from '@/lib/users'
import { dbConfigured } from '@/lib/env'

export const metadata: Metadata = { title: 'Creá tu contraseña', robots: { index: false } }
// Depende de la cookie de activación. Sin esto, un build sin DATABASE_URL (no llama a cookies()) la prerenderiza estática
// y siempre mostraría «El link venció».
export const dynamic = 'force-dynamic'

export default async function ActivarPage() {
  const ses = dbConfigured ? await sesionActivacion() : null
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
