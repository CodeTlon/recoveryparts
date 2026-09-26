import { notFound } from 'next/navigation'
import { requireProfesor } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { ClaseRow } from '@/components/campus/ClaseRow'
import { MaterialManager } from '@/components/campus/MaterialManager'
import { MatriculaEstadoForm } from '@/components/campus/MatriculaEstadoForm'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

type MatriculaConAlumno = {
  id: number
  estado: string
  profiles: { nombre: string; apellido: string; email: string } | null
}

export default async function ProfesorCursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireProfesor()
  const { id } = await params
  const cursoId = Number(id)
  const supabase = await createClient()

  const { data: curso } = await supabase.from('cursos').select('*').eq('id', cursoId).maybeSingle()
  if (!curso || curso.profesor_id !== user.id) notFound()

  const [{ data: clases }, { data: matriculasData }, { data: materiales }] = await Promise.all([
    supabase.from('clases').select('id, numero, fecha, tema, estado').eq('curso_id', cursoId).order('numero'),
    supabase
      .from('matriculas')
      .select('id, estado, profiles:alumno_id(nombre, apellido, email)')
      .eq('curso_id', cursoId)
      .order('created_at', { ascending: false }),
    supabase.from('materiales').select('id, titulo, tipo, url, liberado_en').eq('curso_id', cursoId).order('orden'),
  ])
  const matriculas = matriculasData as unknown as MatriculaConAlumno[] | null

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">{curso.titulo}</h1>
        <p className="text-lg text-on-surface-variant">
          {curso.dias_semana.map((d: number) => DIAS[d]).join('/')} {curso.hora_inicio.slice(0, 5)}–{curso.hora_fin.slice(0, 5)} · Aula {curso.aula}
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-on-surface mb-4">Alumnos</h2>
        <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
                <th className="font-semibold px-4 py-3">Alumno</th>
                <th className="font-semibold px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(matriculas ?? []).map((m) => (
                <tr key={m.id} className="border-t border-outline-variant text-on-surface align-top">
                  <td className="px-4 py-3 font-medium">{m.profiles?.nombre} {m.profiles?.apellido}</td>
                  <td className="px-4 py-3">
                    {m.estado === 'activo' ? (
                      <MatriculaEstadoForm matriculaId={m.id} cursoId={cursoId} estadoActual={m.estado} soloDesertor />
                    ) : (
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-surface-container-high text-on-surface-variant capitalize">{m.estado}</span>
                    )}
                  </td>
                </tr>
              ))}
              {!matriculas?.length && (
                <tr><td colSpan={2} className="px-4 py-6 text-center text-on-surface-variant">Todavía no hay alumnos matriculados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-on-surface mb-4">Temario y calendario</h2>
        <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
                <th className="font-semibold px-4 py-3">N°</th>
                <th className="font-semibold px-4 py-3">Fecha</th>
                <th className="font-semibold px-4 py-3">Tema</th>
                <th className="font-semibold px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(clases ?? []).map((c) => (
                <ClaseRow key={c.id} claseId={c.id} cursoId={cursoId} numero={c.numero} fecha={c.fecha} tema={c.tema} estado={c.estado} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-on-surface mb-4">Material</h2>
        <MaterialManager cursoId={cursoId} materiales={materiales ?? []} />
      </section>
    </>
  )
}
