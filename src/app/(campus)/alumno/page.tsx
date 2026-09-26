import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAlumno } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default async function AlumnoPage() {
  const { user, profile } = await requireAlumno()
  const supabase = await createClient()
  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('curso_id, cursos(id, titulo, aula, dias_semana, hora_inicio, hora_fin)')
    .eq('alumno_id', user.id)
    .eq('estado', 'activo')

  const cursos = (matriculas ?? [])
    .map((m) => m.cursos as unknown as { id: number; titulo: string; aula: string; dias_semana: number[]; hora_inicio: string; hora_fin: string } | null)
    .filter((c): c is NonNullable<typeof c> => !!c)

  // RF-11: con un solo curso activo, entra directo a su página (sin listado intermedio).
  if (cursos.length === 1) redirect(`/alumno/cursos/${cursos[0].id}`)

  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-2 tracking-tight">Hola, {profile.nombre}</h1>
        <p className="text-lg text-on-surface-variant">Tus cursos.</p>
      </header>

      <section className="grid sm:grid-cols-2 gap-6">
        {cursos.map((c) => (
          <Link key={c.id} href={`/alumno/cursos/${c.id}`} className="bg-surface-container-low border border-outline-variant rounded-lg p-6 hover:border-secondary transition-colors block">
            <div className="font-semibold text-on-surface mb-1">{c.titulo}</div>
            <div className="text-sm text-on-surface-variant">
              {c.dias_semana.map((d: number) => DIAS[d]).join('/')} {c.hora_inicio.slice(0, 5)}–{c.hora_fin.slice(0, 5)} · Aula {c.aula}
            </div>
          </Link>
        ))}
        {!cursos.length && (
          <p className="text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg p-6 sm:col-span-2">
            Todavía no tenés cursos asignados.
          </p>
        )}
      </section>
    </>
  )
}
