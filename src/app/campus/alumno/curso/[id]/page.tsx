import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText, Link2, ExternalLink, ArrowLeft, CalendarDays } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import { PageHead, Empty } from '@/components/campus/ui'

type Mat = { id: string; tipo: 'pdf' | 'link'; titulo: string; url: string | null; clase_numero: number | null; clase_titulo: string | null }

export default async function CursoAlumno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb, perfil } = await requireRole('alumno')

  // RLS: solo ve el curso si su inscripción no es desertor.
  const { data: curso } = await sb.from('cursos').select('id, nombre, descripcion').eq('id', id).maybeSingle()
  const { data: insc } = await sb.from('inscripciones').select('estado').eq('curso_id', id).eq('alumno_id', perfil.id).maybeSingle()
  if (!curso || !insc || insc.estado === 'desertor') notFound()

  // RF-32/37: solo material liberado + el título de la clase siguiente (nada posterior).
  const { data: mats } = await sb.rpc('material_visible', { p_curso: id })
  const { data: prox } = await sb.rpc('proxima_clase_titulo', { p_curso: id })
  const siguiente = (prox as { numero: number; fecha: string; titulo: string }[] | null)?.[0]

  const porClase = new Map<string, Mat[]>()
  for (const m of (mats ?? []) as Mat[]) {
    const k = m.clase_numero ? `Clase ${m.clase_numero} · ${m.clase_titulo}` : 'Material general'
    porClase.set(k, [...(porClase.get(k) ?? []), m])
  }

  return (
    <>
      <Link href="/campus/alumno" className="mb-4 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-secondary"><ArrowLeft size={16} /> Mis cursos</Link>
      <PageHead title={curso.nombre} sub={curso.descripcion ?? undefined} />

      {siguiente && (
        <div className="card mb-8 flex items-center gap-3 p-4 text-sm">
          <CalendarDays size={18} className="text-accent" />
          <span>Próxima clase: <strong>#{siguiente.numero} · {siguiente.titulo}</strong> ({fechaAR(siguiente.fecha)})</span>
        </div>
      )}

      {porClase.size === 0 && <Empty>Todavía no hay material liberado. Va a aparecer acá a medida que avance el curso.</Empty>}

      <div className="space-y-8">
        {[...porClase.entries()].map(([titulo, items]) => (
          <section key={titulo}>
            <h2 className="mb-3 text-lg font-semibold">{titulo}</h2>
            <ul className="space-y-2">
              {items.map((m) => (
                <li key={m.id}>
                  {m.tipo === 'pdf' ? (
                    <Link href={`/campus/alumno/curso/${id}/ver/${m.id}`} className="card flex items-center gap-3 p-4 transition-colors hover:border-secondary"><FileText size={20} className="text-primary" /> {m.titulo}<span className="ml-auto text-xs text-on-surface-variant">Ver PDF</span></Link>
                  ) : (
                    <a href={m.url ?? '#'} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 p-4 transition-colors hover:border-secondary"><Link2 size={20} className="text-primary" /> {m.titulo}<ExternalLink size={14} className="ml-auto text-on-surface-variant" /></a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
