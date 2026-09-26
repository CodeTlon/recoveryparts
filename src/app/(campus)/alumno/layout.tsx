import { LayoutDashboard } from 'lucide-react'
import { requireAlumno, nombreCompleto } from '@/lib/auth-helpers'
import { CampusShell, type CampusLink } from '@/components/campus/CampusShell'

const LINKS: CampusLink[] = [{ label: 'Inicio', href: '/alumno', icon: LayoutDashboard }]

export default async function AlumnoLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAlumno()
  return (
    <CampusShell titulo="Portal del Alumno" nombre={nombreCompleto(profile)} links={LINKS}>
      {children}
    </CampusShell>
  )
}
