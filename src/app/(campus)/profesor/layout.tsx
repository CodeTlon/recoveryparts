import { LayoutDashboard } from 'lucide-react'
import { requireProfesor } from '@/lib/auth-helpers'
import { CampusShell, type CampusLink } from '@/components/campus/CampusShell'

const LINKS: CampusLink[] = [{ label: 'Inicio', href: '/profesor', icon: LayoutDashboard }]

export default async function ProfesorLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfesor()
  return (
    <CampusShell titulo="Panel Docente" nombre={profile.nombre || profile.email} links={LINKS}>
      {children}
    </CampusShell>
  )
}
