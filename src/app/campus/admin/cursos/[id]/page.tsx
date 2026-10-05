import { notFound } from 'next/navigation'
import { requireRole, fechaAR } from '@/lib/auth'
import CursoForm from '@/components/campus/CursoForm'
import { ActionForm, Confirm, Empty, Field, PageHead, BackLink, EstadoBadge, Check } from '@/components/campus/ui'
import { añadirAlumno, corregirFechaDesercion, finalizarCurso, guardarClases, guardarHorarios, guardarKit, guardarModulos, marcarDesertor } from '../../actions'
import { hoyAR } from '@/lib/fechas'

export default async function CursoAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb } = await requireRole('admin')
  const { data: curso } = await sb.from('cursos').select('*').eq('id', id).maybeSingle()
  if (!curso) notFound()

  const [{ data: aulas }, { data: profes }, { data: hs }, { data: mods }, { data: kit }, { data: clases }, { data: insc }, { data: mats }] = await Promise.all([
    sb.from('aulas').select('id, nombre').order('nombre'),
    sb.from('profiles').select('id, nombre, apellido').eq('rol', 'profesor').neq('estado_cuenta', 'inactiva').order('apellido'),
    sb.from('horarios_curso').select('*').eq('curso_id', id).order('dia_semana'),
    sb.from('modulos_curso').select('*').eq('curso_id', id).order('orden'),
    sb.from('kit_items').select('*').eq('curso_id', id).order('orden'),
    sb.from('clases').select('*').eq('curso_id', id).order('numero'),
    sb.from('inscripciones').select('id, estado, fecha_desercion, n_clase_desercion, motivo_desercion, profiles!inscripciones_alumno_id_fkey(nombre, apellido, email, estado_cuenta)').eq('curso_id', id),
    sb.from('materiales').select('id, tipo, titulo').eq('curso_id', id),
  ])
  const totalClases = clases?.filter((c) => c.estado === 'programada').length ?? 0
  const hoy = hoyAR()
  const activos = insc?.filter((i) => i.estado === 'activo').length ?? 0

  const hTxt = (hs ?? []).map((h) => `${h.dia_semana} ${h.hora_inicio.slice(0, 5)}-${h.hora_fin.slice(0, 5)}`).join('\n')
  const mTxt = (mods ?? []).map((m) => `# ${m.titulo}\n${m.items.join('\n')}`).join('\n')
  const kTxt = (kit ?? []).map((k) => [k.nombre, k.descripcion ?? '', k.precio ?? '', k.link_externo ?? ''].join(' | ')).join('\n')
  const cTxt = (clases ?? []).map((c) => `${c.numero} | ${c.fecha} | ${c.titulo} | ${c.estado}`).join('\n')

  const sec = 'mb-12'
  return (
    <>
      <BackLink href="/campus/admin/cursos">Cursos</BackLink>
      <PageHead title={curso.nombre} sub={curso.activo ? undefined : 'Curso dado de baja: no se ve en el sitio.'} />

      <section className={sec}>
        <h2 className="mb-4 text-xl font-semibold">Datos del curso</h2>
        <CursoForm curso={curso} aulas={(aulas ?? []).map((a) => [a.id, a.nombre])} profesores={(profes ?? []).map((p) => [p.id, `${p.apellido}, ${p.nombre}`])} />
      </section>

      <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Horarios</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Se valida que el aula y el profesor no se superpongan con otro curso.</p>
        <div className="card max-w-xl p-6"><ActionForm action={guardarHorarios} reset={false}>
          <input type="hidden" name="curso_id" value={id} />
          <Field label="Días y horarios" name="horarios" rows={4} defaultValue={hTxt} hint='Uno por línea: "día 18:00-20:00" (0=Domingo … 6=Sábado).' />
        </ActionForm></div>
      </section>

      <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Plan de estudios público</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Solo el temario de alto nivel; nunca se expone el material del campus.</p>
        <div className="card max-w-3xl p-6"><ActionForm action={guardarModulos} reset={false}>
          <input type="hidden" name="curso_id" value={id} />
          <Field label="Módulos" name="modulos" rows={10} defaultValue={mTxt} hint='"# Título del módulo" y debajo un tema por línea.' />
        </ActionForm></div>
      </section>

      <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Kit necesario (informativo)</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Se muestra en la ficha pública solo si hay ítems. Los links abren el software externo en una pestaña nueva.</p>
        <div className="card max-w-3xl p-6"><ActionForm action={guardarKit} reset={false}>
          <input type="hidden" name="curso_id" value={id} />
          <Field label="Ítems" name="kit" rows={6} defaultValue={kTxt} hint='Uno por línea: "Nombre | Descripción | Precio | https://link".' />
        </ActionForm></div>
      </section>

      <section className={sec}>
        <h2 className="mb-1 text-xl font-semibold">Calendario de clases</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Define el N° de clase en que se calcula una deserción. Las suspendidas/reprogramadas no cuentan.</p>
        <div className="card max-w-3xl p-6"><ActionForm action={guardarClases} reset={false}>
          <input type="hidden" name="curso_id" value={id} />
          <Field label="Clases" name="clases" rows={8} defaultValue={cTxt} hint='"N | AAAA-MM-DD | Título | programada|suspendida|reprogramada".' />
          <Check name="avisar">Avisar por mail a los alumnos activos si hay clases suspendidas o reprogramadas</Check>
        </ActionForm></div>
      </section>

      <section className={sec}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Alumnos <span className="text-base font-normal text-on-surface-variant">({insc?.length ?? 0}/{curso.cupo})</span></h2>
          {activos > 0 && <form action={finalizarCurso}><input type="hidden" name="id" value={id} /><Confirm message="Los alumnos activos pasarán a «Finalizado» y podrán descargar el ZIP de PDFs. ¿Continuar?">Finalizar curso</Confirm></form>}
        </div>

        <div className="card mb-6 max-w-3xl p-6">
          <h3 className="mb-1 font-semibold">Agregar alumno</h3>
          <p className="mb-4 text-sm text-on-surface-variant">Si el email ya existe se lo vincula y se le avisa por mail; si no, se crea el usuario y se le envía la invitación.</p>
          <ActionForm action={añadirAlumno} submit="Agregar al curso">
            <input type="hidden" name="curso_id" value={id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" name="email" type="email" required />
              <Field label="Teléfono (si es nuevo)" name="telefono" type="tel" />
              <Field label="Nombre (si es nuevo)" name="nombre" />
              <Field label="Apellido (si es nuevo)" name="apellido" />
            </div>
          </ActionForm>
        </div>

        {!insc?.length ? <Empty>No hay alumnos en este curso.</Empty> : (
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
                        <input type="hidden" name="id" value={i.id} /><input type="hidden" name="curso_id" value={id} />
                        <Field label="Fecha de deserción" name="fecha" type="date" defaultValue={i.fecha_desercion} required />
                      </ActionForm></div>
                    </details>
                  </div>
                )}

                {i.estado === 'activo' && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-secondary">Marcar como Desertor</summary>
                    <div className="mt-3 max-w-lg">
                      <p className="mb-3 text-xs text-on-surface-variant">Estado final: no vuelve a Activo y pierde el acceso al material de este curso. No se lo elimina del curso. El alumno verá el motivo como aviso en el campus.</p>
                      <ActionForm action={marcarDesertor} submit="Confirmar deserción">
                        <input type="hidden" name="id" value={i.id} /><input type="hidden" name="curso_id" value={id} />
                        <Field label="Fecha de deserción" name="fecha" type="date" defaultValue={hoy} required />
                        <Field label="Motivo (obligatorio)" name="motivo" rows={3} required />
                      </ActionForm>
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Material cargado</h2>
        {!mats?.length ? <Empty>El profesor todavía no cargó material.</Empty> : (
          <ul className="card divide-y divide-outline-variant">{mats.map((m) => <li key={m.id} className="p-4 text-sm">{m.titulo} <span className="ml-2 text-xs uppercase text-on-surface-variant">{m.tipo}</span></li>)}</ul>
        )}
      </section>
    </>
  )
}
