import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarPlus, Copy, ArchiveX, ArchiveRestore, ArrowRight } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import CursoForm from '@/components/campus/CursoForm'
import EdicionForm from '@/components/campus/EdicionForm'
import DuplicarEdicion from '@/components/campus/DuplicarEdicion'
import { ActionForm, Badge, Empty, ModalButton, PageHead, BackLink } from '@/components/campus/ui'
import { guardarKit, guardarModulos, guardarPlanClases, setEstadoEdicion } from '../../actions'
import { hoyAR, etiquetaEdicion } from '@/lib/fechas'
import { KitEditor, ModulosEditor, PlanEditor } from '@/components/campus/ListEditors'

// El curso es el catálogo (se carga una vez); cada vez que se dicta es una edición.
const TABS = [['ediciones', 'Ediciones'], ['datos', 'Datos'], ['plan', 'Plan de estudios'], ['kit', 'Kit'], ['clases', 'Plan de clases'], ['material', 'Material']] as const

type Ed = { id: string; fecha_inicio: string | null; cupo: number; activo: boolean; aula_id: string | null; profesor_id: string | null; aulas: { nombre: string } | null; profiles: { nombre: string; apellido: string } | null; inscripciones: { id: string }[]; clases: { fecha: string }[] }

// Estado temporal de una edición según sus fechas (en curso / próxima / terminada).
function momento(e: Ed, hoy: string) {
  const fin = e.clases.reduce((m, c) => (c.fecha > m ? c.fecha : m), e.fecha_inicio ?? '')
  if (!e.activo) return { fin, label: 'De baja', tone: 'neutral' as const }
  if (e.fecha_inicio && e.fecha_inicio > hoy) return { fin, label: 'Próxima', tone: 'warn' as const }
  if (fin && fin < hoy) return { fin, label: 'Terminada', tone: 'neutral' as const }
  return { fin, label: 'En curso', tone: 'ok' as const }
}

export default async function CursoAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params
  const { tab: t } = await searchParams
  const tab = TABS.some(([k]) => k === t) ? t! : 'ediciones'
  const { sb } = await requireRole('admin')
  const { data: curso } = await sb.from('cursos').select('*').eq('id', id).maybeSingle()
  if (!curso) notFound()

  const [{ data: eds }, { data: aulas }, { data: profes }, { data: mods }, { data: kit }, { data: plan }, { data: mats }] = await Promise.all([
    sb.from('ediciones').select('id, fecha_inicio, cupo, activo, aula_id, profesor_id, aulas(nombre), profiles(nombre, apellido), inscripciones(id), clases(fecha)').eq('curso_id', id).order('fecha_inicio', { ascending: false }),
    sb.from('aulas').select('id, nombre, capacidad, activa').eq('activa', true).order('nombre'),
    sb.from('profiles').select('id, nombre, apellido').eq('rol', 'profesor').neq('estado_cuenta', 'inactiva').order('apellido'),
    sb.from('modulos_curso').select('*').eq('curso_id', id).order('orden'),
    sb.from('kit_items').select('*').eq('curso_id', id).order('orden'),
    sb.from('plan_clases').select('numero, titulo').eq('curso_id', id).order('numero'),
    sb.from('materiales').select('id, tipo, titulo, clase_numero').eq('curso_id', id).order('clase_numero', { nullsFirst: true }),
  ])
  const ediciones = (eds ?? []) as unknown as Ed[]
  const hoy = hoyAR()
  const profOpts: [string, string][] = (profes ?? []).map((p) => [p.id, `${p.apellido}, ${p.nombre}`])
  const mIni = (mods ?? []).map((m) => ({ titulo: m.titulo as string, temas: (m.items as string[]).join('\n') }))
  const kIni = (kit ?? []).map((k) => ({ nombre: k.nombre as string, descripcion: (k.descripcion ?? '') as string, precio: k.precio == null ? '' : String(k.precio), link: (k.link_externo ?? '') as string, requerido: (k.requerido ?? true) as boolean }))
  const pIni = (plan ?? []).map((p) => ({ titulo: p.titulo as string }))
  const tituloClase = (n: number | null) => (n == null ? 'Material general' : `Clase ${n} · ${plan?.find((p) => p.numero === n)?.titulo ?? '(fuera del plan)'}`)

  const sec = 'mb-12'
  const href = (k: string) => `/campus/admin/cursos/${id}?tab=${k}`
  return (
    <>
      <BackLink href="/campus/admin/cursos">Cursos</BackLink>
      <PageHead title={curso.nombre} sub={curso.activo ? 'El contenido se carga una vez; cada vez que se dicta es una edición.' : 'Curso dado de baja: no se ve en el sitio (con todas sus ediciones).'} />

      <nav aria-label="Secciones del curso" className="mb-8 flex flex-wrap gap-2 border-b border-outline-variant pb-3">
        {TABS.map(([k, l]) => (
          <Link key={k} href={href(k)} scroll={false} aria-current={tab === k ? 'page' : undefined}
            className={`rounded px-4 py-2 text-sm font-semibold transition-colors ${tab === k ? 'bg-accent text-surface' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-secondary'}`}>{l}</Link>
        ))}
      </nav>

      {tab === 'ediciones' && <section className={sec}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Ediciones</h2>
            <p className="text-sm text-on-surface-variant">Cada vez que se dicta el curso: fecha, aula, profesor, cupo, calendario y alumnos. Una edición activa por vez.</p>
          </div>
          <ModalButton label={<><CalendarPlus size={16} aria-hidden /> Nueva edición</>} title={`Nueva edición de ${curso.nombre}`} className="btn-primary whitespace-nowrap" wide>
            {!plan?.length && <p className="mb-4 rounded border border-accent/40 bg-accent/10 p-3 text-sm text-secondary">El curso todavía no tiene plan de clases: cargalo antes para poder armar el calendario de la edición.</p>}
            <EdicionForm cursoId={id} aulas={aulas ?? []} profesores={profOpts} />
          </ModalButton>
        </div>
        {!ediciones.length ? <Empty>Este curso todavía no tiene ediciones. Creá la primera con «Nueva edición».</Empty> : (
          <ul className="space-y-3">
            {ediciones.map((e) => {
              const m = momento(e, hoy)
              return (
                <li key={e.id} className={`card p-4 ${e.activo ? '' : 'opacity-70'}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold capitalize">{etiquetaEdicion(e.fecha_inicio)}</p>
                      <p className="text-sm text-on-surface-variant">
                        {fechaAR(e.fecha_inicio)}{m.fin && m.fin !== e.fecha_inicio ? ` → ${fechaAR(m.fin)}` : ''} · {e.aulas?.nombre ?? 'Sin aula'} · {e.profiles ? `${e.profiles.nombre} ${e.profiles.apellido}` : 'Sin profesor'}
                      </p>
                    </div>
                    <Badge>{e.inscripciones.length}/{e.cupo} alumnos</Badge>
                    <Badge tone={m.tone}>{m.label}</Badge>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/campus/admin/cursos/${id}/ediciones/${e.id}`} className="btn-ghost !px-3 !py-2">Gestionar <ArrowRight size={14} aria-hidden /></Link>
                      <ModalButton label={<><Copy size={14} aria-hidden /> Duplicar</>} title={`Duplicar la edición de ${etiquetaEdicion(e.fecha_inicio)}`}>
                        <DuplicarEdicion cursoId={id} edicionId={e.id} />
                      </ModalButton>
                      {e.activo ? (
                        <ModalButton label={<><ArchiveX size={14} aria-hidden /> Baja</>} title={`Dar de baja la edición de ${etiquetaEdicion(e.fecha_inicio)}`} className="btn-ghost !px-3 !py-2 hover:!border-red-400 hover:!text-red-300">
                          <ActionForm action={setEstadoEdicion} submit="Dar de baja">
                            <input type="hidden" name="id" value={e.id} /><input type="hidden" name="activo" value="0" />
                            <p className="text-sm text-on-surface-variant">Deja de verse en el sitio y en el panel del profesor. No afecta al curso ni a las otras ediciones; los alumnos y su historial se conservan.</p>
                          </ActionForm>
                        </ModalButton>
                      ) : (
                        <ModalButton label={<><ArchiveRestore size={14} aria-hidden /> Reactivar</>} title={`Reactivar la edición de ${etiquetaEdicion(e.fecha_inicio)}`} className="btn-ghost !px-3 !py-2 hover:!border-green-400 hover:!text-green-300">
                          <ActionForm action={setEstadoEdicion} submit="Reactivar">
                            <input type="hidden" name="id" value={e.id} /><input type="hidden" name="activo" value="1" />
                            <p className="text-sm text-on-surface-variant">Se valida que no se superponga con otra edición activa, que su aula siga activa y con capacidad para el cupo, y que no choque con otros cursos.</p>
                          </ActionForm>
                        </ModalButton>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>}

      {tab === 'datos' && <section className={sec}>
        <h2 className="mb-4 text-xl font-semibold">Datos del curso</h2>
        <CursoForm curso={curso} />
      </section>}

      {tab === 'plan' && <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Plan de estudios público</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Solo el temario de alto nivel; nunca se expone el material del campus.</p>
        <div className="card max-w-3xl p-6"><ActionForm action={guardarModulos} reset={false}>
          <input type="hidden" name="curso_id" value={id} />
          <ModulosEditor name="modulos" inicial={mIni} />
        </ActionForm></div>
      </section>}

      {tab === 'kit' && <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Kit necesario (informativo)</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Se muestra en la ficha pública solo si hay ítems. Los links abren el software externo en una pestaña nueva.</p>
        <div className="card max-w-3xl p-6"><ActionForm action={guardarKit} reset={false}>
          <input type="hidden" name="curso_id" value={id} />
          <KitEditor name="kit" inicial={kIni} />
        </ActionForm></div>
      </section>}

      {tab === 'clases' && <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Plan de clases</h2>
        <p className="mb-4 text-sm text-on-surface-variant">El título de cada clase, igual en todas las ediciones. Cada edición le asigna sus fechas en su Calendario. El material se asocia a estos números de clase.</p>
        <div className="card max-w-3xl p-6"><ActionForm action={guardarPlanClases} reset={false}>
          <input type="hidden" name="curso_id" value={id} />
          <PlanEditor name="plan" inicial={pIni} />
        </ActionForm></div>
      </section>}

      {tab === 'material' && <section>
        <h2 className="mb-1 text-xl font-semibold">Material del curso</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Lo suben los profesores que dictan el curso. Cada edición lo libera sola cuando llega la fecha de esa clase en su calendario, o el profesor lo libera antes en su edición.</p>
        {!mats?.length ? <Empty>Todavía no hay material cargado.</Empty> : (
          <ul className="card divide-y divide-outline-variant">{mats.map((m) => <li key={m.id} className="flex flex-wrap justify-between gap-2 p-4 text-sm"><span>{m.titulo} <span className="ml-2 text-xs uppercase text-on-surface-variant">{m.tipo}</span></span><span className="text-on-surface-variant">{tituloClase(m.clase_numero)}</span></li>)}</ul>
        )}
      </section>}
    </>
  )
}
