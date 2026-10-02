import Link from 'next/link'
import type { Metadata } from 'next'
import AuthShell from '@/components/auth/AuthShell'
import { ActivarForm } from '@/components/auth/AuthForms'
import { createClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/env'

export const metadata: Metadata = { title: 'Creá tu contraseña' }

export default async function ActivarPage() {
  let user = null
  if (supabaseConfigured) user = (await (await createClient()).auth.getUser()).data.user

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
