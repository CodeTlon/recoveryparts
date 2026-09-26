import Link from 'next/link'
import { requireProfesor } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default async function ProfesorPage() {
  const { user, profile } = await requireProfesor()
  const supabase = await createClient()
  const { data: cursos } = await supabase
    .from('cursos')
    .select('id, titulo, aula, dias_semana, hora_inicio, hora_fin, cupo_total')
    .eq('profesor_id', user.id)
    .neq('estado', 'de_baja')
    .order('fecha_inicio', { ascending: false })

  const cursoIds = (cursos ?? []).map((c) => c.id)
  const { data: conteos } = cursoIds.length
    ? await supabase.from('matriculas').select('curso_id').eq('estado', 'activo').in('curso_id', cursoIds)
    : { data: [] as { curso_id: number }[] }
  const inscriptosPorCurso = new Map<number, number>()
  for (const m of conteos ?? []) inscriptosPorCurso.set(m.curso_id, (inscriptosPorCurso.get(m.curso_id) ?? 0) + 1)

  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-2 tracking-tight">Hola, {profile.nombre}</h1>
        <p className="text-lg text-on-surface-variant">Tus cursos asignados.</p>
      </header>

      <section className="grid sm:grid-cols-2 gap-6">
        {(cursos ?? []).map((c) => (
          <Link key={c.id} href={`/profesor/cursos/${c.id}`} className="bg-surface-container-low border border-outline-variant rounded-lg p-6 hover:border-secondary transition-colors block">
            <div className="font-semibold text-on-surface mb-1">{c.titulo}</div>
            <div className="text-sm text-on-surface-variant mb-4">
              {c.dias_semana.map((d: number) => DIAS[d]).join('/')} {c.hora_inicio.slice(0, 5)}–{c.hora_fin.slice(0, 5)} · Aula {c.aula}
            </div>
            <div className="text-xs text-on-surface-variant uppercase tracking-wider">{inscriptosPorCurso.get(c.id) ?? 0}/{c.cupo_total} alumnos</div>
          </Link>
        ))}
        {!cursos?.length && (
          <p className="text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg p-6 sm:col-span-2">
            Todavía no tenés cursos asignados.
          </p>
        )}
      </section>
    </>
  )
}
