import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import CampusShell from '@/components/campus/CampusShell'

export const metadata: Metadata = { title: 'Campus', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function CampusLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await requireRole('admin', 'profesor', 'alumno')
  return <CampusShell rol={perfil.rol} nombre={`${perfil.nombre} ${perfil.apellido}`.trim() || perfil.email}>{children}</CampusShell>
}
