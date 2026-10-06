import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText, Link2, ExternalLink, CalendarDays } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import { etiquetaEdicion } from '@/lib/fechas'
import { hrefSeguro } from '@/lib/validar'
import { PageHead, Empty, BackLink, Badge } from '@/components/campus/ui'
import { TIPO_CLASE } from '@/components/campus/ArbolEstructura'
import type { TipoClase } from '@/components/campus/ListEditors'
import Reveal from '@/components/ui/Reveal'

type Mat = { id: string; tipo: 'pdf' | 'link'; titulo: string; url: string | null; plan_clase_id: string | null }
type Fila = { modulo_id: string | null; modulo_orden: number | null; modulo_titulo: string | null; plan_clase_id: string | null; clase_numero: number | null; clase_titulo: string | null; clase_tipo: TipoClase | null; es_proxima: boolean }
type Prox = { numero: number; fecha: string; titulo: string; tipo: TipoClase }

export default async function CursoAlumno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb, perfil } = await requireRole('alumno')

  // El id es el de la edición. RLS: solo ve su edición y el curso si su inscripción no es desertora.
  const { data: insc } = await sb.from('inscripciones').select('estado, ediciones(fecha_inicio, cursos(id, nombre, descripcion))').eq('edicion_id', id).eq('alumno_id', perfil.id).maybeSingle()
  const ed = insc?.ediciones as unknown as { fecha_inicio: string | null; cursos: { id: string; nombre: string; descripcion: string | null } | null } | null
  const curso = ed?.cursos
  if (!curso || !insc || insc.estado === 'desertor') notFound()

  // RF-32/37: todos los módulos (solo título), las clases ya dictadas o con material liberado, y de la próxima
  // solo título y tipo. Nada de clases futuras ni de material sin liberar (lo filtra la base).
  const [{ data: tem }, { data: mats }, { data: prox }] = await Promise.all([
    sb.rpc('temario_alumno', { p_edicion: id }),
    sb.rpc('material_visible', { p_edicion: id }),
    sb.rpc('proxima_clase_titulo', { p_edicion: id }),
  ])
  const filas = (tem ?? []) as Fila[]
  const materiales = (mats ?? []) as Mat[]
  const siguiente = (prox as Prox[] | null)?.[0]
  const generales = materiales.filter((m) => !m.plan_clase_id)

  // Bloques en orden: un bloque por módulo (talleres: un bloque sin título con sus clases).
  const bloques: { id: string; titulo: string | null; clases: Fila[] }[] = []
  for (const f of filas) {
    const k = f.modulo_id ?? 'sin-modulo'
    let b = bloques.find((x) => x.id === k)
    if (!b) bloques.push(b = { id: k, titulo: f.modulo_titulo, clases: [] })
    if (f.plan_clase_id) b.clases.push(f)
  }
  const hayAlgo = materiales.length > 0 || filas.some((f) => f.plan_clase_id)
  let nMod = 0

  const item = (m: Mat) => (
    <li key={m.id}>
      {m.tipo === 'pdf' ? (
        <Link href={`/campus/alumno/curso/${id}/ver/${m.id}`} className="card flex items-center gap-3 p-4 transition-colors hover:border-secondary"><FileText size={20} className="text-primary" /> {m.titulo}<span className="ml-auto text-xs text-on-surface-variant">Ver PDF</span></Link>
      ) : (
        <a href={hrefSeguro(m.url)} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 p-4 transition-colors hover:border-secondary"><Link2 size={20} className="text-primary" /> {m.titulo}<ExternalLink size={14} className="ml-auto text-on-surface-variant" /></a>
      )}
    </li>
  )

  return (
    <>
      <BackLink href="/campus/alumno">Mis cursos</BackLink>
      <PageHead title={`${curso.nombre} · ${etiquetaEdicion(ed?.fecha_inicio)}`} sub={curso.descripcion ?? undefined} />

      {siguiente && (
        <div className="card mb-8 flex flex-wrap items-center gap-3 p-4 text-sm">
          <CalendarDays size={18} className="text-accent" />
          <span>Próxima clase: <strong>{siguiente.titulo}</strong> · {TIPO_CLASE[siguiente.tipo]} ({fechaAR(siguiente.fecha)})</span>
        </div>
      )}

      {!hayAlgo && <Empty>Todavía no hay material liberado. Va a aparecer acá a medida que avance el curso.</Empty>}

      <ol className="relative space-y-8 border-l border-outline-variant pl-6 md:pl-8">
        {bloques.map((b, idx) => (
          <Reveal key={b.id} delay={Math.min(idx, 6) * 0.05}>
          <li className="relative">
            <span aria-hidden className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-surface md:-left-[39px] ${b.clases.length ? 'bg-accent shadow-glow' : 'bg-outline-variant'}`} />
            {b.titulo && <h2 className="mb-3 text-lg font-semibold">Módulo {++nMod} · {b.titulo}</h2>}
            {!b.clases.length ? <p className="text-sm text-on-surface-variant">Próximamente.</p> : (
              <div className="space-y-5">
                {b.clases.map((c) => {
                  const ms = materiales.filter((m) => m.plan_clase_id === c.plan_clase_id)
                  return (
                    <section key={c.plan_clase_id}>
                      <h3 className="mb-2 flex flex-wrap items-center gap-2 font-medium">
                        Clase {c.clase_numero} · {c.clase_titulo}
                        {c.clase_tipo && <Badge tone={c.clase_tipo === 'practica' ? 'warn' : 'neutral'}>{TIPO_CLASE[c.clase_tipo]}</Badge>}
                        {c.es_proxima && <Badge tone="ok">Próxima clase</Badge>}
                      </h3>
                      {ms.length ? <ul className="space-y-2">{ms.map(item)}</ul>
                        : <p className="text-sm text-on-surface-variant">{c.es_proxima ? 'Tu profesor libera el material de cada clase.' : 'Sin material para esta clase.'}</p>}
                    </section>
                  )
                })}
              </div>
            )}
          </li>
          </Reveal>
        ))}
        {generales.length > 0 && (
          <li className="relative">
            <span aria-hidden className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-accent shadow-glow ring-4 ring-surface md:-left-[39px]" />
            <h2 className="mb-3 text-lg font-semibold">Material general</h2>
            <ul className="space-y-2">{generales.map(item)}</ul>
          </li>
        )}
      </ol>
    </>
  )
}
