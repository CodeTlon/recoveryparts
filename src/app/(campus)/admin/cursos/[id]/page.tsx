import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { CursoForm } from '@/components/campus/CursoForm'
import { editarCursoAction } from '@/lib/actions/cursos'
import { AgregarAlumnoForm } from '@/components/campus/AgregarAlumnoForm'
import { MatriculaEstadoForm } from '@/components/campus/MatriculaEstadoForm'

type MatriculaConAlumno = {
  id: number
  estado: string
  fecha_inicio: string
  motivo_baja: string | null
  profiles: { nombre: string; apellido: string; email: string } | null
}

export default async function EditarCursoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const cursoId = Number(id)
  const supabase = await createClient()

  const [{ data: curso }, { data: profesores }, { data: matriculasData }] = await Promise.all([
    supabase.from('cursos').select('*').eq('id', cursoId).maybeSingle(),
    supabase.from('profiles').select('id, nombre, apellido').eq('rol', 'profesor').order('nombre'),
    supabase
      .from('matriculas')
      .select('id, estado, fecha_inicio, motivo_baja, profiles:alumno_id(nombre, apellido, email)')
      .eq('curso_id', cursoId)
      .order('created_at', { ascending: false }),
  ])
  const matriculas = matriculasData as unknown as MatriculaConAlumno[] | null

  if (!curso) notFound()

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">{curso.titulo}</h1>
        <p className="text-lg text-on-surface-variant">Editar curso y gestionar alumnos matriculados.</p>
      </header>

      <section className="mb-12 max-w-3xl bg-surface-container-low border border-outline-variant rounded-lg p-6 md:p-8">
        <CursoForm
          action={editarCursoAction}
          profesores={profesores ?? []}
          submitLabel="Guardar cambios"
          bloquearCalendario
          defaultValues={{
            id: curso.id,
            titulo: curso.titulo,
            tipo: curso.tipo,
            area: curso.area,
            descripcion: curso.descripcion,
            requisitos: curso.requisitos,
            dias_semana: curso.dias_semana,
            hora_inicio: curso.hora_inicio,
            hora_fin: curso.hora_fin,
            aula: curso.aula,
            fecha_inicio: curso.fecha_inicio,
            duracion_semanas: curso.duracion_semanas,
            profesor_id: curso.profesor_id,
            cupo_total: curso.cupo_total,
            precio: curso.precio,
            precio_descuento: curso.precio_descuento,
            publicado: curso.publicado,
          }}
        />
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-on-surface mb-4">Agregar alumno</h2>
        <AgregarAlumnoForm cursoId={cursoId} />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-on-surface mb-4">Alumnos matriculados</h2>
        <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
                <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Alumno</th>
                <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Email</th>
                <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(matriculas ?? []).map((m) => (
                <tr key={m.id} className="border-t border-outline-variant text-on-surface align-top">
                  <td className="px-4 py-3 md:px-6 md:py-4 font-medium">{m.profiles?.nombre} {m.profiles?.apellido}</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-on-surface-variant">{m.profiles?.email}</td>
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <MatriculaEstadoForm matriculaId={m.id} cursoId={cursoId} estadoActual={m.estado} />
                  </td>
                </tr>
              ))}
              {!matriculas?.length && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-on-surface-variant">Todavía no hay alumnos matriculados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
