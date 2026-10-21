import Link from 'next/link'
import { ArrowRight, ClipboardList } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { encuestasPendientesDe } from '@/lib/encuestas'
import { etiquetaEdicion } from '@/lib/fechas'
import { PageHead, Empty } from '@/components/campus/ui'

type Insc = { edicion_id: string; ediciones: { curso_id: string; fecha_inicio: string | null } | null }

// RF-47: todas las encuestas pendientes del alumno en un solo lugar, cada una con el curso al que pertenece.
export default async function Encuestas() {
  const { sb, perfil } = await requireRole('alumno')
  const [pendientes, { data: inscs }] = await Promise.all([
    encuestasPendientesDe(perfil.id),
    sb.from('inscripciones').select('edicion_id, ediciones(curso_id, fecha_inicio)').eq('alumno_id', perfil.id),
  ])
  const lista = (inscs ?? []) as unknown as Insc[]
  const ids = [...new Set(lista.map((i) => i.ediciones?.curso_id).filter(Boolean))] as string[]
  const { data: cursos } = ids.length ? await sb.from('cursos_publicos').select('id, nombre').in('id', ids) : { data: [] }
  const curso = (edicionId: string) => {
    const ed = lista.find((i) => i.edicion_id === edicionId)?.ediciones
    const nombre = (cursos as { id: string; nombre: string }[] | null)?.find((c) => c.id === ed?.curso_id)?.nombre
    return nombre ? { nombre, cuando: etiquetaEdicion(ed?.fecha_inicio) } : null
  }

  return (
    <>
      <PageHead title="Encuestas" sub="Tus respuestas son anónimas: la academia no ve quién respondió qué." />
      {!pendientes.length ? <Empty>No tenés encuestas pendientes.</Empty> : (
        <ul className="max-w-3xl space-y-2">
          {pendientes.map((e) => { const c = curso(e.edicion_id); return (
            <li key={e.id}>
              <Link href={`/campus/alumno/encuesta/${e.id}`} className="card flex items-center gap-3 p-4 transition-colors hover:border-secondary">
                <ClipboardList size={20} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{e.titulo}</span>
                  {c && <span className="block text-sm text-on-surface-variant">{c.nombre} · <span className="capitalize">{c.cuando}</span></span>}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-secondary">Responder <ArrowRight size={16} /></span>
              </Link>
            </li>
          ) })}
        </ul>
      )}
    </>
  )
}
