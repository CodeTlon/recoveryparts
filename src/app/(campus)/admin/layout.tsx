import { LayoutDashboard, Users, BookOpen } from 'lucide-react'
import { requireAdmin, nombreCompleto } from '@/lib/auth-helpers'
import { CampusShell, type CampusLink } from '@/components/campus/CampusShell'

const LINKS: CampusLink[] = [
  { label: 'Inicio', href: '/admin', icon: LayoutDashboard },
  { label: 'Cursos', href: '/admin/cursos', icon: BookOpen },
  { label: 'Usuarios', href: '/admin/usuarios', icon: Users },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin()
  return (
    <CampusShell titulo="Panel Admin" nombre={nombreCompleto(profile)} links={LINKS}>
      {children}
    </CampusShell>
  )
}
