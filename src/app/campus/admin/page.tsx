import Link from 'next/link'
import { BookOpen, Users, GraduationCap, Inbox, ArrowUpRight } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { PageHead } from '@/components/campus/ui'
import SpotlightCard from '@/components/ui/SpotlightCard'
import CountUp from '@/components/ui/CountUp'
import Reveal from '@/components/ui/Reveal'

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
    { Icon: Inbox, v: consultas, l: 'Consultas sin leer', href: '/campus/admin/consultas', alert: consultas > 0 },
  ]
  return (
    <>
      <PageHead title="Panel de administración" sub="Vista general de la academia." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ Icon, v, l, href, alert }, i) => (
          <Reveal key={l} delay={i * 0.07}>
            <Link href={href} className="block rounded-card focus-visible:outline-offset-4">
              <SpotlightCard className="p-6">
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent">
                    <Icon size={20} />
                  </span>
                  <ArrowUpRight size={16} className="text-on-surface-variant transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
                <div className="mt-5 flex items-center gap-2 text-4xl font-bold tracking-tight">
                  <CountUp to={v} />
                  {alert && <span aria-label="Hay consultas pendientes" className="h-2.5 w-2.5 rounded-full bg-accent shadow-glow motion-safe:animate-pulse" />}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-on-surface-variant">{l}</div>
              </SpotlightCard>
            </Link>
          </Reveal>
        ))}
      </div>
    </>
  )
}
