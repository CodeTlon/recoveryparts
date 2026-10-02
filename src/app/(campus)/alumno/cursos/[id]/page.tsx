import { notFound } from 'next/navigation'
import { FileText, Video, ExternalLink, Download } from 'lucide-react'
import { requireAlumno } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { EncuestaAlumnoForm } from '@/components/campus/EncuestaAlumnoForm'

export default async function AlumnoCursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAlumno()
  const { id } = await params
  const cursoId = Number(id)
  const supabase = await createClient()

  const { data: matricula } = await supabase
    .from('matriculas')
    .select('id, estado, motivo_baja, fecha_desercion, n_clase_desercion, cursos(id, titulo, aula)')
    .eq('curso_id', cursoId)
    .eq('alumno_id', user.id)
    .maybeSingle()

  if (!matricula) notFound()
  const curso = matricula.cursos as unknown as { id: number; titulo: string; aula: string }

  const hoy = new Date().toISOString().slice(0, 10)
  const [{ data: proximaClase }, { data: materiales }] = await Promise.all([
    supabase
      .from('clases')
      .select('numero, fecha, tema')
      .eq('curso_id', cursoId)
      .eq('estado', 'programada')
      .gte('fecha', hoy)
      .order('fecha')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('materiales')
      .select('id, titulo, tipo, url, storage_path')
      .eq('curso_id', cursoId)
      .lte('liberado_en', new Date().toISOString())
      .order('orden'),
  ])

  let preguntasEncuesta: { id: number; pregunta: string; tipo: string }[] = []
  let encuestaCompletada = true
  if (matricula.estado === 'finalizado') {
    const [{ data: preguntas }, { data: completada }] = await Promise.all([
      supabase.from('encuesta_preguntas').select('id, pregunta, tipo').eq('curso_id', cursoId).order('orden'),
      supabase.from('encuesta_completada').select('matricula_id').eq('matricula_id', matricula.id).maybeSingle(),
    ])
    preguntasEncuesta = preguntas ?? []
    encuestaCompletada = !!completada
  }

  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-2 tracking-tight">{curso.titulo}</h1>
        <p className="text-lg text-on-surface-variant">Aula {curso.aula}</p>
      </header>

      {matricula.estado === 'desertor' && (
        <div role="alert" className="mb-8 rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm">
          <p className="font-semibold text-red-200">
            Fuiste dado de baja de este curso{matricula.fecha_desercion ? ` el ${new Date(matricula.fecha_desercion + 'T00:00').toLocaleDateString('es-AR')}` : ''}
            {matricula.n_clase_desercion != null ? ` (clase ${matricula.n_clase_desercion})` : ''}.
          </p>
          {matricula.motivo_baja && <p className="mt-1 text-on-surface-variant">Motivo: {matricula.motivo_baja}</p>}
          <p className="mt-1 text-on-surface-variant">Ya no tenés acceso al material. Contactá a la administración si creés que es un error.</p>
        </div>
      )}
      {matricula.estado === 'finalizado' && (
        <div className="mb-8">
          <a href={`/api/cursos/${cursoId}/zip`} className="inline-flex items-center gap-2 rounded bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90">
            <Download size={16} /> Descargar todos los PDFs (ZIP)
          </a>
        </div>
      )}

      <section className="mb-16">
        <h2 className="text-xl font-semibold text-on-surface mb-4">Próxima clase</h2>
        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6">
          {proximaClase ? (
            <>
              <div className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Clase {proximaClase.numero} · {proximaClase.fecha}</div>
              <div className="text-lg font-semibold text-on-surface">{proximaClase.tema || 'Tema a confirmar'}</div>
            </>
          ) : (
            <p className="text-on-surface-variant">No hay clases programadas por ahora.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-on-surface mb-4">Material liberado</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(materiales ?? []).map((m) => (
            <div key={m.id} className="flex flex-col gap-2">
            <a
              href={m.storage_path ? `/api/material/${m.id}` : (m.url ?? '#')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface-container-low border border-outline-variant rounded-lg p-6 flex flex-col hover:border-secondary transition-colors group"
            >
              <div className="p-3 bg-surface-container-high rounded-lg text-primary group-hover:text-secondary transition-colors w-fit mb-6">
                {m.tipo === 'pdf' ? <FileText size={28} /> : <Video size={28} />}
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">{m.titulo}</h3>
              <span className="mt-auto pt-4 border-t border-outline-variant text-sm font-semibold text-on-surface-variant group-hover:text-secondary transition-colors flex items-center gap-2">
                Ver <ExternalLink size={14} />
              </span>
            </a>
            {m.storage_path && (
              <a href={`/api/material/${m.id}?download=1`} className="inline-flex items-center justify-center gap-2 rounded border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary">
                <Download size={16} /> Descargar PDF
              </a>
            )}
            </div>
          ))}
          {!materiales?.length && (
            <p className="text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg p-6 sm:col-span-2 lg:col-span-3">
              Todavía no hay material liberado.
            </p>
          )}
        </div>
      </section>

      {matricula.estado === 'finalizado' && preguntasEncuesta.length > 0 && !encuestaCompletada && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold text-on-surface mb-4">Encuesta de fin de curso</h2>
          <EncuestaAlumnoForm matriculaId={matricula.id} preguntas={preguntasEncuesta} />
        </section>
      )}
    </>
  )
}
