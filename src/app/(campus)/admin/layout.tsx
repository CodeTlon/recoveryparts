import { LayoutDashboard, Users } from 'lucide-react'
import { requireAdmin } from '@/lib/auth-helpers'
import { CampusShell, type CampusLink } from '@/components/campus/CampusShell'

const LINKS: CampusLink[] = [
  { label: 'Inicio', href: '/admin', icon: LayoutDashboard },
  { label: 'Usuarios', href: '/admin/usuarios', icon: Users },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin()
  return (
    <CampusShell titulo="Panel Admin" nombre={profile.nombre || profile.email} links={LINKS}>
      {children}
    </CampusShell>
  )
}
