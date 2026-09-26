import { Users } from 'lucide-react'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const { profile } = await requireAdmin()
  const supabase = await createClient()
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-2 tracking-tight">Hola, {profile.nombre || 'admin'}</h1>
        <p className="text-lg text-on-surface-variant">Vista general de la academia.</p>
      </header>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6">
          <Users size={22} className="text-accent" />
          <div className="text-3xl font-bold text-on-surface mt-3">{count ?? 0}</div>
          <div className="text-xs text-on-surface-variant uppercase tracking-wider mt-1">Usuarios totales</div>
        </div>
      </section>
    </>
  )
}
