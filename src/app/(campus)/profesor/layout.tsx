import { LayoutDashboard } from 'lucide-react'
import { requireProfesor, nombreCompleto } from '@/lib/auth-helpers'
import { CampusShell, type CampusLink } from '@/components/campus/CampusShell'

const LINKS: CampusLink[] = [{ label: 'Inicio', href: '/profesor', icon: LayoutDashboard }]

export default async function ProfesorLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfesor()
  return (
    <CampusShell titulo="Panel Docente" nombre={nombreCompleto(profile)} links={LINKS}>
      {children}
    </CampusShell>
  )
}
