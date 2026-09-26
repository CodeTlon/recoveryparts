import { LayoutDashboard, Users, BookOpen, BarChart3, Image as ImageIcon, Quote, HelpCircle, GraduationCap, Mail, Globe } from 'lucide-react'
import { requireAdmin, nombreCompleto } from '@/lib/auth-helpers'
import { CampusShell, type CampusLink } from '@/components/campus/CampusShell'

const LINKS: CampusLink[] = [
  { label: 'Inicio', href: '/admin', icon: LayoutDashboard },
  { label: 'Cursos', href: '/admin/cursos', icon: BookOpen },
  { label: 'Usuarios', href: '/admin/usuarios', icon: Users },
  { label: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
  { label: 'Sitio', href: '/admin/sitio', icon: Globe },
  { label: 'Galería', href: '/admin/galeria', icon: ImageIcon },
  { label: 'Testimonios', href: '/admin/testimonios', icon: Quote },
  { label: 'Egresados', href: '/admin/egresados', icon: GraduationCap },
  { label: 'FAQ', href: '/admin/faq', icon: HelpCircle },
  { label: 'Consultas', href: '/admin/contactos', icon: Mail },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin()
  return (
    <CampusShell titulo="Panel Admin" nombre={nombreCompleto(profile)} links={LINKS}>
      {children}
    </CampusShell>
  )
}
