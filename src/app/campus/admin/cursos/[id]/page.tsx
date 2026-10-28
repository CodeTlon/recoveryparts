import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarPlus, Copy, ArchiveX, ArchiveRestore, ArrowRight, FileText, Link2, Trash2 } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import CursoForm from '@/components/campus/CursoForm'
import EdicionForm from '@/components/campus/EdicionForm'
import DuplicarEdicion from '@/components/campus/DuplicarEdicion'
import { ActionForm, Badge, Confirm, Empty, ModalButton, PageHead, BackLink } from '@/components/campus/ui'
import MaterialForms from '@/components/campus/MaterialForms'
import { borrarMaterial } from '../../../profesor/actions'
import { guardarEstructura, guardarKit, setEstadoEdicion } from '../../actions'
import { hoyAR, etiquetaEdicion, momentoEdicion } from '@/lib/fechas'
import { EstructuraEditor, KitEditor } from '@/components/campus/ListEditors'
import ArbolEstructura, { type ArbolClase, type ArbolMaterial, type ArbolModulo } from '@/components/campus/ArbolEstructura'

// El curso es el catálogo (se carga una vez); cada vez que se dicta es una edición.
const TABS = [['ediciones', 'Ediciones'], ['datos', 'Datos'], ['estructura', 'Estructura'], ['kit', 'Kit'], ['material', 'Material']] as const

type Ed = { id: string; fecha_inicio: string | null; cupo: number; activo: boolean; aula_id: string | null; profesor_id: string | null; aulas: { nombre: string } | null; profiles: { nombre: string; apellido: string } | null; inscripciones: { id: string }[]; clases: { fecha: string }[] }

// Estado temporal de una edición según sus fechas (en curso / próxima / terminada).
const MOMENTO = { baja: ['De baja', 'neutral'], proxima: ['Próxima', 'warn'], terminada: ['Terminada', 'neutral'], en_curso: ['En curso', 'ok'] } as const
function momento(e: Ed, hoy: string, duracionSemanas: number | null) {
  const { momento: m, fin } = momentoEdicion({ activo: e.activo, fecha_inicio: e.fecha_inicio, fechas: e.clases.map((c) => c.fecha), duracionSemanas }, hoy)
  return { fin, label: MOMENTO[m][0], tone: MOMENTO[m][1] }
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
    sb.from('modulos_curso').select('id, titulo, orden').eq('curso_id', id).is('edicion_id', null).order('orden'), // guía general
    sb.from('kit_items').select('*').eq('curso_id', id).order('orden'),
    sb.from('plan_clases').select('id, numero, titulo, tipo, modulo_id, edicion_id').eq('curso_id', id).order('numero'),
    sb.from('materiales').select('id, tipo, titulo, plan_clase_id').eq('curso_id', id).is('edicion_id', null).order('creado_en'), // material base
  ])
  const ediciones = (eds ?? []) as unknown as Ed[]
  const hoy = hoyAR()
  const profOpts: [string, string][] = (profes ?? []).map((p) => [p.id, `${p.apellido}, ${p.nombre}`])
  const kIni = (kit ?? []).map((k) => ({ nombre: k.nombre as string, descripcion: (k.descripcion ?? '') as string, precio: k.precio == null ? '' : String(k.precio), link: (k.link_externo ?? '') as string, requerido: (k.requerido ?? true) as boolean }))
  const modulos = (mods ?? []) as ArbolModulo[]
  // RF-58: la guía general son las clases sin edición; una edición con clases propias está personalizada.
  const planTodo = (plan ?? []) as (ArbolClase & { edicion_id: string | null })[]
  const clases: ArbolClase[] = planTodo.filter((c) => !c.edicion_id)
  const personalizadas = new Set(planTodo.map((c) => c.edicion_id).filter(Boolean))
  const materiales = (mats ?? []) as ArbolMaterial[]
  const conMaterial = Object.fromEntries(clases.map((c) => [c.id, materiales.filter((m) => m.plan_clase_id === c.id).length]))
  const taller = curso.tipo === 'taller'

  const sec = 'mb-12'
  const href = (k: string) => `/campus/admin/cursos/${id}?tab=${k}`
  return (
    <>
      <BackLink href="/campus/admin/cursos">Cursos</BackLink>
      <PageHead title={curso.nombre} sub={curso.activo ? 'El contenido se carga una vez; cada vez que se dicta es una edición.' : 'Curso dado de baja: no se ve en el sitio (con todas sus ediciones).'} />

      <nav aria-label="Secciones del curso" className="mb-8 flex flex-wrap gap-2 border-b border-outline-variant pb-3">
        {TABS.map(([k, l]) => (
          <Link key={k} href={href(k)} scroll={false} aria-current={tab === k ? 'page' : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === k ? 'bg-on-surface text-surface-container-lowest' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-accent'}`}>{l}</Link>
        ))}
      </nav>

      {tab === 'ediciones' && <section className={sec}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Ediciones</h2>
            <p className="text-sm text-on-surface-variant">Cada vez que se dicta el curso: fecha, aula, profesor, cupo, calendario y alumnos. Una edición activa por vez.</p>
          </div>
          <ModalButton label={<><CalendarPlus size={16} aria-hidden /> Nueva edición</>} title={`Nueva edición de ${curso.nombre}`} className="btn-primary whitespace-nowrap" wide>
            {!plan?.length && <p className="mb-4 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-secondary">El curso todavía no tiene clases: cargalas en «Estructura» para poder armar el calendario de la edición.</p>}
            <EdicionForm cursoId={id} aulas={aulas ?? []} profesores={profOpts} />
          </ModalButton>
        </div>
        {!ediciones.length ? <Empty>Este curso todavía no tiene ediciones. Creá la primera con «Nueva edición».</Empty> : (
          <ul className="space-y-3">
            {ediciones.map((e) => {
              const m = momento(e, hoy, curso.duracion_semanas)
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
                    {personalizadas.has(e.id) && <Badge tone="warn">Estructura propia</Badge>}
                    <Badge tone={m.tone}>{m.label}</Badge>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/campus/admin/cursos/${id}/ediciones/${e.id}`} className="btn-ghost px-3! py-2!">Gestionar <ArrowRight size={14} aria-hidden /></Link>
                      <ModalButton label={<><Copy size={14} aria-hidden /> Duplicar</>} title={`Duplicar la edición de ${etiquetaEdicion(e.fecha_inicio)}`}>
                        <DuplicarEdicion cursoId={id} edicionId={e.id} />
                      </ModalButton>
                      {e.activo ? (
                        <ModalButton label={<><ArchiveX size={14} aria-hidden /> Baja</>} title={`Dar de baja la edición de ${etiquetaEdicion(e.fecha_inicio)}`} className="btn-ghost px-3! py-2! hover:border-danger! hover:text-danger!">
                          <ActionForm action={setEstadoEdicion} submit="Dar de baja">
                            <input type="hidden" name="id" value={e.id} /><input type="hidden" name="activo" value="0" />
                            <p className="text-sm text-on-surface-variant">Deja de verse en el sitio y en el panel del profesor. No afecta al curso ni a las otras ediciones; los alumnos y su historial se conservan.</p>
                          </ActionForm>
                        </ModalButton>
                      ) : (
                        <ModalButton label={<><ArchiveRestore size={14} aria-hidden /> Reactivar</>} title={`Reactivar la edición de ${etiquetaEdicion(e.fecha_inicio)}`} className="btn-ghost px-3! py-2! hover:border-success! hover:text-success!">
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

      {tab === 'estructura' && <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Guía general del curso</h2>
        <p className="mb-4 text-sm text-on-surface-variant">
          {taller ? 'Las clases del taller, en orden (los talleres no llevan módulos).' : 'Los módulos y, dentro de cada uno, sus clases en orden. Todo módulo tiene clases y toda clase está en un módulo.'}
          {' '}Con esta guía arranca cada edición nueva. El profesor puede adaptarla en su edición sin cambiarla acá: las ediciones con «Estructura propia» ya no siguen estos cambios. {taller ? 'En el sitio no se muestra temario.' : 'En el sitio solo se ven los títulos de los módulos.'}
        </p>
        <div className="max-w-4xl"><ActionForm action={guardarEstructura} reset={false}>
          <input type="hidden" name="curso_id" value={id} />
          {/* key: tras guardar se vuelve a montar con los ids nuevos (si no, un segundo guardado duplicaría lo agregado) */}
          <EstructuraEditor key={[...modulos, ...clases].map((x) => x.id).join()} name="estructura" taller={taller} inicial={{ modulos, clases }} conMaterial={conMaterial} />
        </ActionForm></div>
        <h3 className="mb-3 mt-10 text-lg font-semibold">Cómo queda</h3>
        <div className="max-w-3xl"><ArbolEstructura modulos={modulos} clases={clases} materiales={materiales} /></div>
      </section>}

      {tab === 'kit' && <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Kit necesario (informativo)</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Se muestra en la ficha pública solo si hay ítems. Los links abren el software externo en una pestaña nueva.</p>
        <div className="card max-w-3xl p-6"><ActionForm action={guardarKit} reset={false}>
          <input type="hidden" name="curso_id" value={id} />
          <KitEditor name="kit" inicial={kIni} />
        </ActionForm></div>
      </section>}

      {tab === 'material' && <section>
        <h2 className="mb-1 text-xl font-semibold">Material base del curso</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Se carga sobre las clases de la guía general y aparece en todas las ediciones que conservan esa clase. En cada edición el alumno lo ve solo cuando el profesor lo libera (RF-32). El profesor no puede borrarlo; el material que sube él vale solo para su edición y no se muestra acá.</p>
        {!materiales.length && <Empty>Todavía no hay material base cargado.</Empty>}
        <div className="mb-6 max-w-3xl"><ArbolEstructura modulos={modulos} clases={clases} materiales={materiales} renderMaterial={(m) => (
          <div className="flex flex-wrap items-center gap-3">
            {m.tipo === 'pdf' ? <FileText size={16} className="text-primary" /> : <Link2 size={16} className="text-primary" />}
            <span className="min-w-0 flex-1 font-medium">{m.titulo}</span>
            {m.tipo === 'pdf' && <a href={`/api/material/${m.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3! py-2!">Ver</a>}
            <ActionForm action={borrarMaterial} submit={null} reset={false} okLabel="Hecho">
              <input type="hidden" name="id" value={m.id} />
              <Confirm message="¿Eliminar este material base? Deja de verse en todas las ediciones del curso."><Trash2 size={14} /><span className="sr-only">Eliminar</span></Confirm>
            </ActionForm>
          </div>
        )} /></div>
        <MaterialForms cursoId={id} modulos={modulos} clases={clases} />
      </section>}
    </>
  )
}
