import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import CampusShell from '@/components/campus/CampusShell'
import { encuestasPendientesDe } from '@/lib/encuestas'

export const metadata: Metadata = { title: 'Campus', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function CampusLayout({ children }: { children: React.ReactNode }) {
  const { sb, perfil } = await requireRole('admin', 'profesor', 'alumno')
  // RF-47: el menú del alumno muestra cuántas encuestas tiene sin responder; el del admin, cuántas consultas sin leer.
  const avisos: Record<string, number> | undefined = perfil.rol === 'alumno' ? { '/campus/alumno/encuestas': (await encuestasPendientesDe(perfil.id)).length }
    : perfil.rol === 'admin' ? { '/campus/admin/consultas': (await sb.from('contactos').select('*', { count: 'exact', head: true }).eq('leido', false)).count ?? 0 }
    : undefined
  return <CampusShell rol={perfil.rol} nombre={`${perfil.nombre} ${perfil.apellido}`.trim() || perfil.email} avisos={avisos}>{children}</CampusShell>
}
