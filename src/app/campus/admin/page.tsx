import Link from 'next/link'
import { BookOpen, Users, GraduationCap, Inbox } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { PageHead } from '@/components/campus/ui'

export default async function AdminHome() {
  const { sb } = await requireRole('admin')
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0
  const [cursos, alumnos, profes, consultas] = await Promise.all([
    count(sb.from('cursos').select('*', { count: 'exact', head: true }).eq('activo', true)),
    count(sb.from('profiles').select('*', { count: 'exact', head: true }).eq('rol', 'alumno')),
    count(sb.from('profiles').select('*', { count: 'exact', head: true }).eq('rol', 'profesor')),
    count(sb.from('contactos').select('*', { count: 'exact', head: true }).eq('leido', false)),
  ])
  const kpis = [
    { Icon: BookOpen, v: cursos, l: 'Cursos y talleres activos', href: '/campus/admin/cursos' },
    { Icon: Users, v: alumnos, l: 'Alumnos', href: '/campus/admin/usuarios?rol=alumno' },
    { Icon: GraduationCap, v: profes, l: 'Profesores', href: '/campus/admin/usuarios?rol=profesor' },
    { Icon: Inbox, v: consultas, l: 'Consultas sin leer', href: '/campus/admin/consultas' },
  ]
  return (
    <>
      <PageHead title="Panel de administración" sub="Vista general de la academia." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ Icon, v, l, href }) => (
          <Link key={l} href={href} className="card p-6 transition-colors hover:border-secondary">
            <Icon size={22} className="text-accent" />
            <div className="mt-3 text-3xl font-bold">{v}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-on-surface-variant">{l}</div>
          </Link>
        ))}
      </div>
    </>
  )
}
