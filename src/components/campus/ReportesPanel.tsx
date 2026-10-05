import { requireRole } from '@/lib/auth'
import { DIAS } from '@/lib/types'
import { Empty } from '@/components/campus/ui'
import AnimatedBar from '@/components/ui/AnimatedBar'
import { Columns, Donut, Stat } from '@/components/campus/charts'
import Reveal from '@/components/ui/Reveal'
import { hoyAR, etiquetaEdicion } from '@/lib/fechas'

type Insc = { alumno_id: string; edicion_id: string; estado: string; n_clase_desercion: number | null; motivo_desercion: string | null; creado_en: string }
// Una fila por edición; `nombre` = «Curso · mes año». `curso_id`/`curso` agrupan las ediciones de un mismo curso.
type Curso = { id: string; curso_id: string; curso: string; nombre: string; cupo: number; creado_en: string; fecha_inicio: string | null; activo: boolean; horarios_curso: { dia_semana: number }[] }

const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0)

function Bar({ v, max }: { v: number; max: number }) {
  return <AnimatedBar value={v} max={max} />
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <Reveal className="h-full"><section className="card h-full p-6"><h2 className="text-lg font-semibold">{title}</h2>{note && <p className="mb-4 text-xs text-on-surface-variant">{note}</p>}<div className={note ? '' : 'mt-4'}>{children}</div></section></Reveal>
}

export default async function ReportesPanel() {
  const { sb } = await requireRole('admin')
  const [{ data: eds }, { data: insc }, { data: demanda }] = await Promise.all([
    sb.from('ediciones').select('id, curso_id, cupo, creado_en, fecha_inicio, activo, cursos(nombre, activo), horarios_curso(dia_semana)'),
    sb.from('inscripciones').select('alumno_id, edicion_id, estado, n_clase_desercion, motivo_desercion, creado_en'),
    sb.from('demanda_cursos').select('interes'),
  ])
  const todas = ((eds ?? []) as unknown as (Omit<Curso, 'curso' | 'nombre'> & { cursos: { nombre: string; activo: boolean } | null })[])
    .map((e) => ({ ...e, curso: e.cursos?.nombre ?? 'Curso', nombre: `${e.cursos?.nombre ?? 'Curso'} · ${etiquetaEdicion(e.fecha_inicio)}`, cursoActivo: !!e.cursos?.activo }))
  // Se reporta sobre ediciones activas de cursos activos; `todas` sirve para ubicar el curso de cualquier inscripción.
  const C: Curso[] = todas.filter((e) => e.activo && e.cursoActivo)
  const cursoDe = new Map(todas.map((e) => [e.id, e.curso_id]))
  const nombreCurso = new Map(todas.map((e) => [e.curso_id, e.curso]))
  const idsC = new Set(C.map((c) => c.id))
  const I = ((insc ?? []) as Insc[]).filter((i) => idsC.has(i.edicion_id))
  const nombre = (cursoId: string) => nombreCurso.get(cursoId) ?? 'Curso dado de baja'

  // RF-48 · ocupación = inscriptos / cupo
  const ocup = C.map((c) => { const n = I.filter((i) => i.edicion_id === c.id).length; return { nombre: c.nombre, n, cupo: c.cupo, p: pct(n, c.cupo) } }).sort((a, b) => b.p - a.p)

  const estados = { activo: I.filter((i) => i.estado === 'activo').length, finalizado: I.filter((i) => i.estado === 'finalizado').length, desertor: I.filter((i) => i.estado === 'desertor').length }

  // RF-48 · días con mayor deserción (día del curso donde hubo desertores)
  const diasDes = new Array(7).fill(0)
  for (const i of I.filter((x) => x.estado === 'desertor')) C.find((c) => c.id === i.edicion_id)?.horarios_curso.forEach((h) => diasDes[h.dia_semana]++)

  // RF-49 · deserción por curso y por N° de clase
  const des = C.map((c) => {
    const todos = I.filter((i) => i.edicion_id === c.id), d = todos.filter((i) => i.estado === 'desertor')
    const porClase = new Map<number, number>(); d.forEach((i) => porClase.set(i.n_clase_desercion ?? 0, (porClase.get(i.n_clase_desercion ?? 0) ?? 0) + 1))
    return { nombre: c.nombre, total: todos.length, d: d.length, p: pct(d.length, todos.length), porClase: [...porClase.entries()].sort((a, b) => a[0] - b[0]), motivos: d.map((x) => x.motivo_desercion) }
  }).filter((x) => x.total > 0)

  // RF-50 · velocidad de llenado
  const llenos = C.map((c) => {
    const ord = I.filter((i) => i.edicion_id === c.id).map((i) => i.creado_en).sort()
    return ord.length >= c.cupo ? { nombre: c.nombre, dias: Math.max(0, Math.round((+new Date(ord[c.cupo - 1]) - +new Date(c.creado_en)) / 864e5)) } : null
  }).filter(Boolean).sort((a, b) => a!.dias - b!.dias) as { nombre: string; dias: number }[]
  const hoy = hoyAR()
  const vacios = ocup.filter((o) => { const c = C.find((x) => x.nombre === o.nombre); return o.p < 50 && (!c?.fecha_inicio || c.fecha_inicio <= hoy) })

  // RF-51 · qué curso eligen al terminar uno (otro curso, no otra edición del mismo)
  const sig = new Map<string, number>()
  const todasInsc = (insc ?? []) as Insc[]
  for (const f of todasInsc.filter((i) => i.estado === 'finalizado'))
    for (const j of todasInsc.filter((i) => i.alumno_id === f.alumno_id && cursoDe.get(i.edicion_id) !== cursoDe.get(f.edicion_id) && i.creado_en > f.creado_en)) {
      const k = cursoDe.get(j.edicion_id); if (k) sig.set(k, (sig.get(k) ?? 0) + 1)
    }
  const siguientes = [...sig.entries()].sort((a, b) => b[1] - a[1])

  // RF-52 · demanda de cursos que no se dictan
  const dem = new Map<string, number>(); (demanda ?? []).forEach((d) => { const k = d.interes.trim().toLowerCase(); dem.set(k, (dem.get(k) ?? 0) + 1) })
  const demanda_ = [...dem.entries()].sort((a, b) => b[1] - a[1])

  return (
    <>
      <p className="mb-6 text-sm text-on-surface-variant">Ocupación = alumnos inscriptos / cupo (los pagos no se manejan en este sistema).</p>
      {!C.length ? <Empty>Todavía no hay datos para reportar.</Empty> : (
        <>
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Finalizados" value={estados.finalizado} note="inscripciones completadas" />
          <Stat label="Inscripciones activas" value={estados.activo} note={`${I.length} en total`} />
          <Stat label="Ocupación promedio" value={`${ocup.length ? Math.round(ocup.reduce((a, o) => a + o.p, 0) / ocup.length) : 0}%`} note="inscriptos / cupo" />
          <Stat label="Deserción global" value={`${pct(estados.desertor, I.length)}%`} note={`${estados.desertor} de ${I.length}`} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Estado de las inscripciones">
            <Donut caption="Estado de las inscripciones" center={<div><p className="text-2xl font-bold tabular-nums">{I.length}</p><p className="text-[11px] text-on-surface-variant">inscripciones</p></div>}
              data={[{ label: 'Activos', value: estados.activo, color: 'text-green-400' }, { label: 'Finalizados', value: estados.finalizado, color: 'text-sky-400' }, { label: 'Desertores', value: estados.desertor, color: 'text-red-400' }]} />
          </Card>
          <Card title="Ocupación por edición">
            <ul className="space-y-3">{ocup.map((o) => <li key={o.nombre}><div className="mb-1 flex justify-between text-sm"><span>{o.nombre}</span><span className="text-on-surface-variant">{o.n}/{o.cupo} · {o.p}%</span></div><Bar v={o.p} max={100} /></li>)}</ul>
          </Card>
          <Card title="Días con mayor deserción" note="Desertores según el día de cursada.">
            <Columns data={DIAS.map((d, i) => ({ label: d.slice(0, 3), value: diasDes[i] }))} color="bg-red-400" />
          </Card>
          <Card title="Deserción por edición" note="Cantidad, % sobre el total y en qué N° de clase desertan." >
            {!des.length ? <p className="text-sm text-on-surface-variant">Sin inscripciones.</p> : <ul className="space-y-5">{des.map((x) => (
              <li key={x.nombre}>
                <p className="flex justify-between text-sm font-semibold"><span>{x.nombre}</span><span>{x.d} de {x.total} · {x.p}%</span></p>
                {x.porClase.length > 0 && <p className="mt-1 text-xs text-on-surface-variant">Por clase: {x.porClase.map(([n, c]) => `clase ${n}: ${c}`).join(' · ')}</p>}
                {x.motivos.length > 0 && <details className="mt-1 text-xs text-on-surface-variant"><summary className="cursor-pointer text-secondary">Motivos</summary><ul className="mt-1 list-disc pl-5">{x.motivos.map((m, k) => <li key={k}>{m}</li>)}</ul></details>}
              </li>))}</ul>}
          </Card>
          <Card title="Velocidad de llenado" note="Días desde que se creó la edición hasta completar el cupo.">
            {llenos.length ? <ul className="mb-4 space-y-1 text-sm">{llenos.map((l) => <li key={l.nombre} className="flex justify-between"><span>{l.nombre}</span><span className="text-on-surface-variant">{l.dias} días</span></li>)}</ul> : <p className="mb-4 text-sm text-on-surface-variant">Ninguna edición completó su cupo todavía.</p>}
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">No se llenan (menos del 50% y ya iniciados)</p>
            <p className="mt-1 text-sm">{vacios.length ? vacios.map((v) => `${v.nombre} (${v.p}%)`).join(' · ') : '—'}</p>
          </Card>
          <Card title="Qué eligen al terminar un curso" note="Cursos en los que se inscriben los alumnos que finalizaron otro.">
            {siguientes.length ? <ul className="space-y-1 text-sm">{siguientes.map(([id, n]) => <li key={id} className="flex justify-between"><span>{nombre(id)}</span><span className="text-on-surface-variant">{n}</span></li>)}</ul> : <p className="text-sm text-on-surface-variant">Todavía no hay datos.</p>}
          </Card>
          <Card title="Demanda de cursos que aún no se dictan" note="Pedidos registrados desde el buscador del sitio.">
            {demanda_.length ? <ul className="space-y-1 text-sm">{demanda_.map(([k, n]) => <li key={k} className="flex justify-between"><span className="capitalize">{k}</span><span className="text-on-surface-variant">{n}</span></li>)}</ul> : <p className="text-sm text-on-surface-variant">Todavía no hay pedidos.</p>}
          </Card>
        </div>
        </>
      )}
    </>
  )
}
