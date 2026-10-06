import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole, fechaAR } from '@/lib/auth'
import EdicionForm from '@/components/campus/EdicionForm'
import { ActionForm, Confirm, Empty, Field, PageHead, BackLink, EstadoBadge, Check } from '@/components/campus/ui'
import { agregarAlumno, corregirFechaDesercion, finalizarEdicion, guardarClases, guardarHorarios, marcarDesertor } from '../../../../actions'
import { hoyAR, etiquetaEdicion } from '@/lib/fechas'
import { ClasesEditor, HorariosEditor } from '@/components/campus/ListEditors'

const TABS = [['datos', 'Datos'], ['horarios', 'Horarios'], ['calendario', 'Calendario'], ['alumnos', 'Alumnos']] as const

export default async function EdicionAdmin({ params, searchParams }: { params: Promise<{ id: string; eid: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id, eid } = await params
  const { tab: t } = await searchParams
  const tab = TABS.some(([k]) => k === t) ? t! : 'datos'
  const { sb } = await requireRole('admin')
  const { data: ed } = await sb.from('ediciones').select('id, curso_id, fecha_inicio, aula_id, profesor_id, cupo, activo, cursos(nombre, activo)').eq('id', eid).eq('curso_id', id).maybeSingle()
  if (!ed) notFound()
  const curso = ed.cursos as unknown as { nombre: string; activo: boolean }

  const [{ data: aulas }, { data: profes }, { data: hs }, { data: plan }, { data: clases }, { data: insc }, { data: mods }] = await Promise.all([
    sb.from('aulas').select('id, nombre, capacidad, activa').order('nombre'),
    sb.from('profiles').select('id, nombre, apellido').eq('rol', 'profesor').neq('estado_cuenta', 'inactiva').order('apellido'),
    sb.from('horarios_curso').select('*').eq('edicion_id', eid).order('dia_semana'),
    sb.from('plan_clases').select('id, numero, titulo, modulo_id').eq('curso_id', id).order('numero'),
    sb.from('clases').select('plan_clase_id, fecha, estado').eq('edicion_id', eid),
    sb.from('inscripciones').select('id, estado, fecha_desercion, n_clase_desercion, motivo_desercion, profiles!inscripciones_alumno_id_fkey(nombre, apellido, email, estado_cuenta)').eq('edicion_id', eid),
    sb.from('modulos_curso').select('id, titulo').eq('curso_id', id),
  ])
  const totalClases = clases?.filter((c) => c.estado === 'programada').length ?? 0
  const hoy = hoyAR()
  const activos = insc?.filter((i) => i.estado === 'activo').length ?? 0
  const hIni = (hs ?? []).map((h) => ({ dia: h.dia_semana as number, ini: h.hora_inicio.slice(0, 5) as string, fin: h.hora_fin.slice(0, 5) as string }))
  const sinFechas = !clases?.length

  const sec = 'mb-12'
  const href = (k: string) => `/campus/admin/cursos/${id}/ediciones/${eid}?tab=${k}`
  const nombre = `${curso.nombre} · ${etiquetaEdicion(ed.fecha_inicio)}`
  return (
    <>
      <BackLink href={`/campus/admin/cursos/${id}?tab=ediciones`}>{curso.nombre}</BackLink>
      <PageHead title={nombre} sub={!ed.activo ? 'Edición dada de baja: no se ve en el sitio ni en el panel del profesor.' : !curso.activo ? 'El curso está dado de baja.' : `Inicia el ${fechaAR(ed.fecha_inicio)}.`} />

      {sinFechas && tab !== 'calendario' && (
        <p className="mb-6 rounded border border-accent/40 bg-accent/10 p-3 text-sm text-secondary">
          Esta edición todavía no tiene fechas de clase. <Link href={href('calendario')} className="font-semibold underline">Asignalas en Calendario</Link> (primero cargá los horarios).
        </p>
      )}

      <nav aria-label="Secciones de la edición" className="mb-8 flex flex-wrap gap-2 border-b border-outline-variant pb-3">
        {TABS.map(([k, l]) => (
          <Link key={k} href={href(k)} scroll={false} aria-current={tab === k ? 'page' : undefined}
            className={`rounded px-4 py-2 text-sm font-semibold transition-colors ${tab === k ? 'bg-accent text-surface' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-secondary'}`}>{l}</Link>
        ))}
      </nav>

      {tab === 'datos' && <section className={`${sec} max-w-3xl`}>
        <h2 className="mb-4 text-xl font-semibold">Datos de la edición</h2>
        {/* RF-03: aulas activas, más la que ya tiene la edición aunque esté dada de baja */}
        <EdicionForm cursoId={id} edicion={ed} aulas={(aulas ?? []).filter((a) => a.activa || a.id === ed.aula_id)} profesores={(profes ?? []).map((p) => [p.id, `${p.apellido}, ${p.nombre}`])} />
      </section>}

      {tab === 'horarios' && <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Horarios</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Se valida que el aula y el profesor no se superpongan con otra edición en el mismo período.</p>
        <div className="card max-w-xl p-6"><ActionForm action={guardarHorarios} reset={false}>
          <input type="hidden" name="edicion_id" value={eid} />
          <HorariosEditor name="horarios" inicial={hIni} />
        </ActionForm></div>
      </section>}

      {tab === 'calendario' && <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Calendario</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Las clases y sus títulos vienen de la estructura del curso; acá se asigna la fecha de cada una en esta edición (se puede adelantar o saltear una clase). Las suspendidas, reprogramadas y salteadas no cuentan para el N° de clase de deserción.</p>
        <div className="max-w-4xl"><ActionForm action={guardarClases} reset={false}>
          <input type="hidden" name="edicion_id" value={eid} />
          <ClasesEditor name="clases" plan={(plan ?? []).map((p) => ({ ...p, modulo: mods?.find((m) => m.id === p.modulo_id)?.titulo }))} inicial={clases ?? []} inicio={ed.fecha_inicio} dias={[...new Set(hIni.map((h) => h.dia))]}
            avisar={<Check name="avisar">Avisar por mail a los alumnos activos si hay clases suspendidas o reprogramadas</Check>} />
        </ActionForm></div>
      </section>}

      {tab === 'alumnos' && <section className={sec}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Alumnos <span className="text-base font-normal text-on-surface-variant">({insc?.length ?? 0}/{ed.cupo})</span></h2>
          {activos > 0 && <form action={finalizarEdicion}><input type="hidden" name="id" value={eid} /><Confirm message="Los alumnos activos pasarán a «Finalizado» y podrán descargar el ZIP de PDFs. ¿Continuar?">Finalizar edición</Confirm></form>}
        </div>

        <div className="card mb-6 max-w-3xl p-6">
          <h3 className="mb-1 font-semibold">Agregar alumno</h3>
          <p className="mb-4 text-sm text-on-surface-variant">Si el email ya existe se lo vincula y se le avisa por mail; si no, se crea el usuario y se le envía la invitación. Un alumno puede cursar otra edición del mismo curso (por ejemplo, si desertó y retoma).</p>
          <ActionForm action={agregarAlumno} submit="Agregar a la edición">
            <input type="hidden" name="edicion_id" value={eid} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" name="email" placeholder="nombre@ejemplo.com" type="email" required />
              <Field label="Teléfono (si es nuevo)" name="telefono" placeholder="Ej: 351 123 4567" type="tel" />
              <Field label="Nombre (si es nuevo)" name="nombre" placeholder="Ej: María" />
              <Field label="Apellido (si es nuevo)" name="apellido" placeholder="Ej: González" />
            </div>
          </ActionForm>
        </div>

        {!insc?.length ? <Empty>No hay alumnos en esta edición.</Empty> : (
          <ul className="space-y-3">
            {insc.map((i: any) => (
              <li key={i.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{i.profiles?.apellido}, {i.profiles?.nombre}</p>
                    <p className="truncate text-sm text-on-surface-variant">{i.profiles?.email}{i.profiles?.estado_cuenta === 'inactiva' ? ' · cuenta deshabilitada' : ''}</p>
                  </div>
                  <EstadoBadge estado={i.estado} />
                </div>

                {i.estado === 'desertor' && (
                  <div className="mt-3 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm">
                    <p className="font-semibold text-red-200">Desertó en la clase {i.n_clase_desercion} de {totalClases} · {fechaAR(i.fecha_desercion)}</p>
                    <p className="mt-1 text-on-surface-variant">Motivo: {i.motivo_desercion}</p>
                    <details className="mt-2"><summary className="cursor-pointer text-secondary">Corregir fecha</summary>
                      <div className="mt-2 max-w-xs"><ActionForm action={corregirFechaDesercion} reset={false} submit="Recalcular">
                        <input type="hidden" name="id" value={i.id} />
                        <Field label="Fecha de deserción" name="fecha" type="date" defaultValue={i.fecha_desercion} required />
                      </ActionForm></div>
                    </details>
                  </div>
                )}

                {i.estado === 'activo' && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-secondary">Marcar como Desertor</summary>
                    <div className="mt-3 max-w-lg">
                      <p className="mb-3 text-xs text-on-surface-variant">Estado final en esta edición: no vuelve a Activo y pierde el acceso al material de esta edición. No se lo elimina. Puede retomar inscribiéndose en otra edición.</p>
                      <ActionForm action={marcarDesertor} submit="Confirmar deserción">
                        <input type="hidden" name="id" value={i.id} />
                        <Field label="Fecha de deserción" name="fecha" type="date" defaultValue={hoy} required />
                        <Field label="Motivo (obligatorio)" name="motivo" placeholder="Ej: Cambió de horario laboral" rows={3} required />
                      </ActionForm>
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>}
    </>
  )
}
