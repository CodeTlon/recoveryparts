import Link from 'next/link'
import { MapPin, Users, ArrowRight } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { DIAS } from '@/lib/types'
import { PageHead, Empty } from '@/components/campus/ui'

export default async function ProfesorHome() {
  const { sb, perfil } = await requireRole('profesor')
  // RLS: solo sus cursos.
  const { data: cursos } = await sb.from('cursos').select('id, nombre, tipo, activo, aulas(nombre), horarios_curso(dia_semana, hora_inicio, hora_fin), inscripciones(estado)').eq('profesor_id', perfil.id).eq('activo', true).order('nombre')

  return (
    <>
      <PageHead title="Mis cursos" sub="Horario, aula y alumnos de los cursos que dictás." />
      {!cursos?.length && <Empty>Todavía no tenés cursos asignados.</Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {cursos?.map((c: any) => (
          <Link key={c.id} href={`/campus/profesor/curso/${c.id}`} className="card p-6 transition-colors hover:border-secondary">
            <h2 className="mb-3 text-xl font-semibold">{c.nombre}</h2>
            <p className="mb-1 flex items-center gap-2 text-sm text-on-surface-variant"><MapPin size={16} /> {c.aulas?.nombre ?? 'Aula sin asignar'}</p>
            <p className="mb-1 text-sm text-on-surface-variant">{c.horarios_curso.length ? c.horarios_curso.map((h: any) => `${DIAS[h.dia_semana].slice(0, 3)} ${h.hora_inicio.slice(0, 5)}–${h.hora_fin.slice(0, 5)}`).join(' · ') : 'Sin horario'}</p>
            <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant"><Users size={16} /> {c.inscripciones.filter((i: any) => i.estado !== 'desertor').length} alumnos</p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-secondary">Abrir <ArrowRight size={16} /></span>
          </Link>
        ))}
      </div>
    </>
  )
}
