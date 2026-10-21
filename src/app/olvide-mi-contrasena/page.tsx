import type { Metadata } from 'next'
import AuthShell from '@/components/auth/AuthShell'
import { OlvideForm } from '@/components/auth/AuthForms'

export const metadata: Metadata = { title: 'Recuperar contraseña', robots: { index: false } }
// La CSP lleva un nonce distinto por request: una página estática no podría llevarlo y sus scripts quedarían bloqueados.
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <AuthShell eyebrow="Cuenta" title="¿Olvidaste tu contraseña?" subtitle="Ingresá tu email y te enviamos un link. También sirve si tu invitación venció.">
      <OlvideForm />
    </AuthShell>
  )
}
