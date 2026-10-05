import Link from 'next/link'
import { BookOpen, CalendarDays, GraduationCap, Inbox, Users, ArrowUpRight } from 'lucide-react'
import { fechaAR, requireRole } from '@/lib/auth'
import { PageHead } from '@/components/campus/ui'
import SpotlightCard from '@/components/ui/SpotlightCard'
import CountUp from '@/components/ui/CountUp'
import Reveal from '@/components/ui/Reveal'
import ReportesPanel from '@/components/campus/ReportesPanel'
import { hoyAR } from '@/lib/fechas'

// Resumen del administrador: lo que requiere atención hoy + los reportes de la academia (antes en /reportes).
export default async function AdminHome() {
  const { sb } = await requireRole('admin')
  const hoy = hoyAR()
  const en14 = new Date(new Date(`${hoy}T12:00:00Z`).getTime() + 14 * 864e5).toISOString().slice(0, 10)
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0
  const [cursos, alumnos, profes, consultas, { data: clases }, { data: msgs }, { data: porIniciar }] = await Promise.all([
    count(sb.from('cursos').select('*', { count: 'exact', head: true }).eq('activo', true)),
    count(sb.from('profiles').select('*', { count: 'exact', head: true }).eq('rol', 'alumno')),
    count(sb.from('profiles').select('*', { count: 'exact', head: true }).eq('rol', 'profesor')),
    count(sb.from('contactos').select('*', { count: 'exact', head: true }).eq('leido', false)),
    sb.from('clases').select('id, numero, fecha, estado, ediciones!inner(activo, curso_id, cursos(nombre))').eq('ediciones.activo', true).gte('fecha', hoy).lte('fecha', en14).order('fecha').limit(6),
    sb.from('contactos').select('id, nombre, mensaje, leido, creado_en').order('creado_en', { ascending: false }).limit(4),
    sb.from('ediciones').select('id, curso_id, fecha_inicio, cursos!inner(nombre, tipo, activo)').eq('activo', true).eq('cursos.activo', true).gte('fecha_inicio', hoy).order('fecha_inicio').limit(5),
  ])
  const kpis = [
    { Icon: BookOpen, v: cursos, l: 'Cursos y talleres activos', href: '/campus/admin/cursos' },
    { Icon: Users, v: alumnos, l: 'Alumnos', href: '/campus/admin/usuarios?rol=alumno' },
    { Icon: GraduationCap, v: profes, l: 'Profesores', href: '/campus/admin/usuarios?rol=profesor' },
    { Icon: Inbox, v: consultas, l: 'Consultas sin leer', href: '/campus/admin/consultas', alert: consultas > 0 },
  ]
  // Las relaciones muchos-a-uno llegan como objeto (el tipo inferido es una lista).
  const uno = <T,>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x) ?? null
  type Clase = { id: string; numero: number; fecha: string; estado: string; ediciones: { curso_id: string; cursos: { nombre: string } | null } | null }
  type PorIniciar = { id: string; curso_id: string; fecha_inicio: string; cursos: { nombre: string; tipo: string } | null }
  const lista = 'divide-y divide-outline-variant text-sm'
  return (
    <>
      <PageHead title="Resumen" sub="Lo que pasa en la academia: novedades, próximas fechas y reportes." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ Icon, v, l, href, alert }, i) => (
          <Reveal key={l} delay={i * 0.05} className="h-full">
            <Link href={href} className="block h-full">
              <SpotlightCard className={`relative h-full p-5 ${alert ? 'ring-1 ring-accent/60' : ''}`}>
                <div className="flex items-center justify-between"><Icon size={20} className="text-secondary" aria-hidden /><ArrowUpRight size={16} className="text-on-surface-variant" aria-hidden /></div>
                <p className="mt-3 text-3xl font-bold tabular-nums text-primary"><CountUp to={v} /></p>
                <p className="text-sm text-on-surface-variant">{l}</p>
              </SpotlightCard>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays size={18} className="text-secondary" aria-hidden /> Próximas clases <span className="text-xs font-normal text-on-surface-variant">(14 días)</span></h2>
          {clases?.length ? (
            <ul className={lista}>
              {(clases as unknown as Clase[]).map((c) => (
                <li key={c.id} className="py-2">
                  <p className="font-medium">{uno(uno(c.ediciones)?.cursos)?.nombre ?? 'Curso'}</p>
                  <p className="text-xs text-on-surface-variant">{fechaAR(c.fecha)} · clase {c.numero}{c.estado !== 'programada' ? ` · ${c.estado}` : ''}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-on-surface-variant">No hay clases en los próximos 14 días.</p>}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Inbox size={18} className="text-secondary" aria-hidden /> Últimas consultas</h2>
          {msgs?.length ? (
            <ul className={lista}>
              {msgs.map((m) => (
                <li key={m.id} className="py-2">
                  <p className="font-medium">{m.nombre}{!m.leido && <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-secondary">Nueva</span>}</p>
                  <p className="line-clamp-2 text-xs text-on-surface-variant">{m.mensaje}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-on-surface-variant">Todavía no hay consultas.</p>}
          <Link href="/campus/admin/consultas" className="mt-3 inline-block text-sm font-semibold text-secondary hover:underline">Ver todas →</Link>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><BookOpen size={18} className="text-secondary" aria-hidden /> Por empezar</h2>
          {porIniciar?.length ? (
            <ul className={lista}>
              {(porIniciar as unknown as PorIniciar[]).map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 py-2">
                  <Link href={`/campus/admin/cursos/${c.curso_id}/ediciones/${c.id}`} className="font-medium hover:text-secondary">{uno(c.cursos)?.nombre ?? 'Curso'}</Link>
                  <span className="shrink-0 text-xs text-on-surface-variant">{fechaAR(c.fecha_inicio)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-on-surface-variant">No hay ediciones por empezar.</p>}
        </section>
      </div>

      <h2 className="mb-4 mt-12 text-2xl font-semibold">Reportes</h2>
      <ReportesPanel />
    </>
  )
}
