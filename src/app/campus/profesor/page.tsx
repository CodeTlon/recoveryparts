import Link from 'next/link'
import { MapPin, Users, ArrowRight, CalendarDays } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import { DIAS } from '@/lib/types'
import { etiquetaEdicion, hoyAR, momentoEdicion } from '@/lib/fechas'
import { PageHead, Empty, Badge } from '@/components/campus/ui'

type Ed = { id: string; fecha_inicio: string | null; cursos: { nombre: string; activo: boolean; duracion_semanas: number | null } | null; aulas: { nombre: string } | null; horarios_curso: { dia_semana: number; hora_inicio: string; hora_fin: string }[]; inscripciones: { estado: string }[]; clases: { fecha: string }[] }

export default async function ProfesorHome() {
  const { sb, perfil } = await requireRole('profesor')
  // RLS: solo las ediciones que dicta. RF-04: solo las en curso y las próximas (las terminadas no se muestran),
  // primero las en curso y después las próximas, cada grupo por fecha de inicio.
  const { data } = await sb.from('ediciones').select('id, fecha_inicio, cursos(nombre, activo, duracion_semanas), aulas(nombre), horarios_curso(dia_semana, hora_inicio, hora_fin), inscripciones(estado), clases(fecha)')
    .eq('profesor_id', perfil.id).eq('activo', true).order('fecha_inicio')
  const hoy = hoyAR()
  const eds = ((data ?? []) as unknown as Ed[]).filter((e) => e.cursos?.activo)
    .map((e) => ({ ...e, momento: momentoEdicion({ activo: true, fecha_inicio: e.fecha_inicio, fechas: e.clases.map((c) => c.fecha), duracionSemanas: e.cursos?.duracion_semanas }, hoy).momento }))
    .filter((e) => e.momento === 'en_curso' || e.momento === 'proxima')
    .sort((a, b) => Number(a.momento === 'proxima') - Number(b.momento === 'proxima') || (a.fecha_inicio ?? '').localeCompare(b.fecha_inicio ?? ''))

  return (
    <>
      <PageHead title="Mis cursos" sub="Los cursos que estás dando y los que vienen: horario, aula, alumnos, calendario y material." />
      {!eds.length && <Empty>Todavía no tenés cursos asignados.</Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {eds.map((e) => (
          <Link key={e.id} href={`/campus/profesor/curso/${e.id}`} className="card p-6 transition-colors hover:border-secondary">
            <div className="mb-1 flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold">{e.cursos?.nombre}</h2>
              {e.momento === 'en_curso' ? <Badge tone="ok">En curso</Badge> : <Badge tone="warn">Próximo</Badge>}
            </div>
            <p className="mb-3 text-sm font-semibold capitalize text-secondary">{etiquetaEdicion(e.fecha_inicio)}</p>
            <p className="mb-1 flex items-center gap-2 text-sm text-on-surface-variant"><CalendarDays size={16} /> Inicia el {fechaAR(e.fecha_inicio)}</p>
            <p className="mb-1 flex items-center gap-2 text-sm text-on-surface-variant"><MapPin size={16} /> {e.aulas?.nombre ?? 'Aula sin asignar'}</p>
            <p className="mb-1 text-sm text-on-surface-variant">{e.horarios_curso.length ? e.horarios_curso.map((h) => `${DIAS[h.dia_semana].slice(0, 3)} ${h.hora_inicio.slice(0, 5)}–${h.hora_fin.slice(0, 5)}`).join(' · ') : 'Sin horario'}</p>
            <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant"><Users size={16} /> {(() => { const n = e.inscripciones.filter((i) => i.estado !== 'desertor').length; return `${n} ${n === 1 ? 'alumno' : 'alumnos'}` })()}</p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-secondary">Abrir <ArrowRight size={16} /></span>
          </Link>
        ))}
      </div>
    </>
  )
}
