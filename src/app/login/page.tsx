import type { Metadata } from 'next'
import AuthShell from '@/components/auth/AuthShell'
import { LoginForm } from '@/components/auth/AuthForms'
import { dbConfigured } from '@/lib/env'

export const metadata: Metadata = { title: 'Campus', robots: { index: false } }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <AuthShell eyebrow="Campus virtual" title="Ingresá a tu campus" subtitle="Acceso para alumnos, profesores y administración. Tu acceso te lo da la academia por mail.">
      {!dbConfigured && <p role="alert" className="card mb-4 border-accent p-4 text-sm text-secondary">Falta configurar la base de datos (DATABASE_URL, ver docs/ENTORNOS.md).</p>}
      {error === 'cuenta' && <p role="alert" className="mb-4 text-sm text-red-400">Tu cuenta no está activa. Contactá a la academia.</p>}
      <LoginForm />
    </AuthShell>
  )
}
