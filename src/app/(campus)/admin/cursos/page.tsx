import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

type CursoConProfesor = {
  id: number
  titulo: string
  aula: string
  dias_semana: number[]
  hora_inicio: string
  hora_fin: string
  cupo_total: number
  estado: string
  publicado: boolean
  profiles: { nombre: string; apellido: string } | null
}

export default async function AdminCursosPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data } = await supabase
    .from('cursos')
    .select('id, titulo, aula, dias_semana, hora_inicio, hora_fin, cupo_total, estado, publicado, profiles:profesor_id(nombre, apellido)')
    .order('created_at', { ascending: false })
  const cursos = data as unknown as CursoConProfesor[] | null

  const cursoIds = (cursos ?? []).map((c) => c.id)
  const { data: conteos } = cursoIds.length
    ? await supabase.from('matriculas').select('curso_id').eq('estado', 'activo').in('curso_id', cursoIds)
    : { data: [] as { curso_id: number }[] }
  const inscriptosPorCurso = new Map<number, number>()
  for (const m of conteos ?? []) inscriptosPorCurso.set(m.curso_id, (inscriptosPorCurso.get(m.curso_id) ?? 0) + 1)

  return (
    <>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">Cursos</h1>
          <p className="text-lg text-on-surface-variant">Cursos y talleres de la academia.</p>
        </div>
        <Link href="/admin/cursos/nuevo" className="py-3 px-6 text-sm font-semibold uppercase tracking-wide bg-accent text-white rounded transition-opacity hover:opacity-90 flex items-center gap-2">
          <Plus size={16} /> Nuevo curso
        </Link>
      </header>

      <section className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
              <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Curso</th>
              <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Profesor</th>
              <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Horario</th>
              <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Inscriptos</th>
              <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(cursos ?? []).map((c) => (
              <tr key={c.id} className="border-t border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors">
                <td className="px-4 py-3 md:px-6 md:py-4">
                  <Link href={`/admin/cursos/${c.id}`} className="font-medium hover:text-secondary transition-colors">{c.titulo}</Link>
                </td>
                <td className="px-4 py-3 md:px-6 md:py-4 text-on-surface-variant">
                  {c.profiles ? `${c.profiles.nombre} ${c.profiles.apellido}` : '—'}
                </td>
                <td className="px-4 py-3 md:px-6 md:py-4 text-on-surface-variant">
                  {c.dias_semana.map((d: number) => DIAS[d]).join('/')} {c.hora_inicio.slice(0, 5)}–{c.hora_fin.slice(0, 5)} · {c.aula}
                </td>
                <td className="px-4 py-3 md:px-6 md:py-4 text-on-surface-variant">{inscriptosPorCurso.get(c.id) ?? 0}/{c.cupo_total}</td>
                <td className="px-4 py-3 md:px-6 md:py-4">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    c.estado === 'de_baja' ? 'bg-surface-container-highest text-on-surface-variant'
                    : c.publicado ? 'bg-accent text-white' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {c.estado === 'de_baja' ? 'De baja' : c.estado === 'finalizado' ? 'Finalizado' : c.publicado ? 'Publicado' : 'Borrador'}
                  </span>
                </td>
              </tr>
            ))}
            {!cursos?.length && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant">Todavía no hay cursos.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )
}
