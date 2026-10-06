import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarPlus, Copy, ArchiveX, ArchiveRestore, ArrowRight } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import CursoForm from '@/components/campus/CursoForm'
import EdicionForm from '@/components/campus/EdicionForm'
import DuplicarEdicion from '@/components/campus/DuplicarEdicion'
import { ActionForm, Badge, Empty, ModalButton, PageHead, BackLink } from '@/components/campus/ui'
import { guardarEstructura, guardarKit, setEstadoEdicion } from '../../actions'
import { hoyAR, etiquetaEdicion } from '@/lib/fechas'
import { EstructuraEditor, KitEditor } from '@/components/campus/ListEditors'
import ArbolEstructura, { type ArbolClase, type ArbolMaterial, type ArbolModulo } from '@/components/campus/ArbolEstructura'

// El curso es el catálogo (se carga una vez); cada vez que se dicta es una edición.
const TABS = [['ediciones', 'Ediciones'], ['datos', 'Datos'], ['estructura', 'Estructura'], ['kit', 'Kit'], ['material', 'Material']] as const

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
    sb.from('modulos_curso').select('id, titulo, orden').eq('curso_id', id).order('orden'),
    sb.from('kit_items').select('*').eq('curso_id', id).order('orden'),
    sb.from('plan_clases').select('id, numero, titulo, tipo, modulo_id').eq('curso_id', id).order('numero'),
    sb.from('materiales').select('id, tipo, titulo, plan_clase_id').eq('curso_id', id).order('creado_en'),
  ])
  const ediciones = (eds ?? []) as unknown as Ed[]
  const hoy = hoyAR()
  const profOpts: [string, string][] = (profes ?? []).map((p) => [p.id, `${p.apellido}, ${p.nombre}`])
  const kIni = (kit ?? []).map((k) => ({ nombre: k.nombre as string, descripcion: (k.descripcion ?? '') as string, precio: k.precio == null ? '' : String(k.precio), link: (k.link_externo ?? '') as string, requerido: (k.requerido ?? true) as boolean }))
  const modulos = (mods ?? []) as ArbolModulo[]
  const clases = (plan ?? []) as ArbolClase[]
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
            {!plan?.length && <p className="mb-4 rounded border border-accent/40 bg-accent/10 p-3 text-sm text-secondary">El curso todavía no tiene clases: cargalas en «Estructura» para poder armar el calendario de la edición.</p>}
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

      {tab === 'estructura' && <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Estructura del curso</h2>
        <p className="mb-4 text-sm text-on-surface-variant">
          {taller ? 'Las clases del taller, en orden (los talleres no llevan módulos).' : 'Los módulos y, dentro de cada uno, sus clases en orden. Todo módulo tiene clases y toda clase está en un módulo.'}
          {' '}La comparten todas las ediciones; cada edición pone las fechas en su calendario. {taller ? 'En el sitio no se muestra temario.' : 'En el sitio solo se ven los títulos de los módulos.'}
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
        <h2 className="mb-1 text-xl font-semibold">Material del curso</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Lo suben los profesores que dictan el curso. En cada edición el alumno lo ve solo cuando el profesor lo libera (RF-32).</p>
        {!materiales.length && <Empty>Todavía no hay material cargado.</Empty>}
        <div className="max-w-3xl"><ArbolEstructura modulos={modulos} clases={clases} materiales={materiales} /></div>
      </section>}
    </>
  )
}
