import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText, Link2, ExternalLink, CalendarDays } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import { etiquetaEdicion } from '@/lib/fechas'
import { hrefSeguro } from '@/lib/validar'
import { PageHead, Empty, BackLink } from '@/components/campus/ui'
import Reveal from '@/components/ui/Reveal'

type Mat = { id: string; tipo: 'pdf' | 'link'; titulo: string; url: string | null; clase_numero: number | null; clase_titulo: string | null }

export default async function CursoAlumno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb, perfil } = await requireRole('alumno')

  // El id es el de la edición. RLS: solo ve su edición y el curso si su inscripción no es desertora.
  const { data: insc } = await sb.from('inscripciones').select('estado, ediciones(fecha_inicio, cursos(id, nombre, descripcion))').eq('edicion_id', id).eq('alumno_id', perfil.id).maybeSingle()
  const ed = insc?.ediciones as unknown as { fecha_inicio: string | null; cursos: { id: string; nombre: string; descripcion: string | null } | null } | null
  const curso = ed?.cursos
  if (!curso || !insc || insc.estado === 'desertor') notFound()

  // RF-32/37: solo material liberado + el título de la clase siguiente (nada posterior).
  const { data: mats } = await sb.rpc('material_visible', { p_edicion: id })
  const { data: prox } = await sb.rpc('proxima_clase_titulo', { p_edicion: id })
  const siguiente = (prox as { numero: number; fecha: string; titulo: string }[] | null)?.[0]

  const porClase = new Map<string, Mat[]>()
  for (const m of (mats ?? []) as Mat[]) {
    const k = m.clase_numero ? `Clase ${m.clase_numero} · ${m.clase_titulo}` : 'Material general'
    porClase.set(k, [...(porClase.get(k) ?? []), m])
  }

  return (
    <>
      <BackLink href="/campus/alumno">Mis cursos</BackLink>
      <PageHead title={`${curso.nombre} · ${etiquetaEdicion(ed?.fecha_inicio)}`} sub={curso.descripcion ?? undefined} />

      {siguiente && (
        <div className="card mb-8 flex items-center gap-3 p-4 text-sm">
          <CalendarDays size={18} className="text-accent" />
          <span>Próxima clase: <strong>#{siguiente.numero} · {siguiente.titulo}</strong> ({fechaAR(siguiente.fecha)})</span>
        </div>
      )}

      {porClase.size === 0 && <Empty>Todavía no hay material liberado. Va a aparecer acá a medida que avance el curso.</Empty>}

      <ol className="relative space-y-8 border-l border-outline-variant pl-6 md:pl-8">
        {[...porClase.entries()].map(([titulo, items], idx) => (
          <Reveal key={titulo} delay={Math.min(idx, 6) * 0.05}>
          <li className="relative">
            <span aria-hidden className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-accent shadow-glow ring-4 ring-surface md:-left-[39px]" />
            <h2 className="mb-3 text-lg font-semibold">{titulo}</h2>
            <ul className="space-y-2">
              {items.map((m) => (
                <li key={m.id}>
                  {m.tipo === 'pdf' ? (
                    <Link href={`/campus/alumno/curso/${id}/ver/${m.id}`} className="card flex items-center gap-3 p-4 transition-colors hover:border-secondary"><FileText size={20} className="text-primary" /> {m.titulo}<span className="ml-auto text-xs text-on-surface-variant">Ver PDF</span></Link>
                  ) : (
                    <a href={hrefSeguro(m.url)} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 p-4 transition-colors hover:border-secondary"><Link2 size={20} className="text-primary" /> {m.titulo}<ExternalLink size={14} className="ml-auto text-on-surface-variant" /></a>
                  )}
                </li>
              ))}
            </ul>
          </li>
          </Reveal>
        ))}
      </ol>
    </>
  )
}
