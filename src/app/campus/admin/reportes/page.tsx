import { requireRole } from '@/lib/auth'
import { DIAS } from '@/lib/types'
import { Empty, PageHead } from '@/components/campus/ui'
import AnimatedBar from '@/components/ui/AnimatedBar'
import Reveal from '@/components/ui/Reveal'
import { hoyAR } from '@/lib/fechas'

type Insc = { alumno_id: string; curso_id: string; estado: string; n_clase_desercion: number | null; motivo_desercion: string | null; creado_en: string }
type Curso = { id: string; nombre: string; cupo: number; creado_en: string; fecha_inicio: string | null; horarios_curso: { dia_semana: number }[] }

const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0)

function Bar({ v, max }: { v: number; max: number }) {
  return <AnimatedBar value={v} max={max} />
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <Reveal className="h-full"><section className="card h-full p-6"><h2 className="text-lg font-semibold">{title}</h2>{note && <p className="mb-4 text-xs text-on-surface-variant">{note}</p>}<div className={note ? '' : 'mt-4'}>{children}</div></section></Reveal>
}

export default async function Reportes() {
  const { sb } = await requireRole('admin')
  const [{ data: cursos }, { data: insc }, { data: demanda }] = await Promise.all([
    sb.from('cursos').select('id, nombre, cupo, creado_en, fecha_inicio, horarios_curso(dia_semana)').eq('activo', true),
    sb.from('inscripciones').select('alumno_id, curso_id, estado, n_clase_desercion, motivo_desercion, creado_en'),
    sb.from('demanda_cursos').select('interes'),
  ])
  const C = (cursos ?? []) as Curso[], I = (insc ?? []) as Insc[]
  const nombre = (id: string) => C.find((c) => c.id === id)?.nombre ?? 'Curso dado de baja'

  // RF-48 · ocupación = inscriptos / cupo
  const ocup = C.map((c) => { const n = I.filter((i) => i.curso_id === c.id).length; return { nombre: c.nombre, n, cupo: c.cupo, p: pct(n, c.cupo) } }).sort((a, b) => b.p - a.p)

  // RF-48 · días con mayor deserción (día del curso donde hubo desertores)
  const diasDes = new Array(7).fill(0)
  for (const i of I.filter((x) => x.estado === 'desertor')) C.find((c) => c.id === i.curso_id)?.horarios_curso.forEach((h) => diasDes[h.dia_semana]++)

  // RF-49 · deserción por curso y por N° de clase
  const des = C.map((c) => {
    const todos = I.filter((i) => i.curso_id === c.id), d = todos.filter((i) => i.estado === 'desertor')
    const porClase = new Map<number, number>(); d.forEach((i) => porClase.set(i.n_clase_desercion ?? 0, (porClase.get(i.n_clase_desercion ?? 0) ?? 0) + 1))
    return { nombre: c.nombre, total: todos.length, d: d.length, p: pct(d.length, todos.length), porClase: [...porClase.entries()].sort((a, b) => a[0] - b[0]), motivos: d.map((x) => x.motivo_desercion) }
  }).filter((x) => x.total > 0)

  // RF-50 · velocidad de llenado
  const llenos = C.map((c) => {
    const ord = I.filter((i) => i.curso_id === c.id).map((i) => i.creado_en).sort()
    return ord.length >= c.cupo ? { nombre: c.nombre, dias: Math.max(0, Math.round((+new Date(ord[c.cupo - 1]) - +new Date(c.creado_en)) / 864e5)) } : null
  }).filter(Boolean).sort((a, b) => a!.dias - b!.dias) as { nombre: string; dias: number }[]
  const hoy = hoyAR()
  const vacios = ocup.filter((o) => { const c = C.find((x) => x.nombre === o.nombre); return o.p < 50 && (!c?.fecha_inicio || c.fecha_inicio <= hoy) })

  // RF-51 · qué curso eligen al terminar uno
  const sig = new Map<string, number>()
  for (const f of I.filter((i) => i.estado === 'finalizado'))
    for (const j of I.filter((i) => i.alumno_id === f.alumno_id && i.curso_id !== f.curso_id && i.creado_en > f.creado_en)) sig.set(j.curso_id, (sig.get(j.curso_id) ?? 0) + 1)
  const siguientes = [...sig.entries()].sort((a, b) => b[1] - a[1])

  // RF-52 · demanda de cursos que no se dictan
  const dem = new Map<string, number>(); (demanda ?? []).forEach((d) => { const k = d.interes.trim().toLowerCase(); dem.set(k, (dem.get(k) ?? 0) + 1) })
  const demanda_ = [...dem.entries()].sort((a, b) => b[1] - a[1])

  return (
    <>
      <PageHead title="Reportes" sub="Ocupación = alumnos inscriptos / cupo (los pagos no se manejan en este sistema)." />
      {!C.length ? <Empty>Todavía no hay datos para reportar.</Empty> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Ocupación por curso">
            <ul className="space-y-3">{ocup.map((o) => <li key={o.nombre}><div className="mb-1 flex justify-between text-sm"><span>{o.nombre}</span><span className="text-on-surface-variant">{o.n}/{o.cupo} · {o.p}%</span></div><Bar v={o.p} max={100} /></li>)}</ul>
          </Card>
          <Card title="Días con mayor deserción">
            <ul className="space-y-3">{DIAS.map((d, i) => <li key={d}><div className="mb-1 flex justify-between text-sm"><span>{d}</span><span className="text-on-surface-variant">{diasDes[i]}</span></div><Bar v={diasDes[i]} max={Math.max(...diasDes)} /></li>)}</ul>
          </Card>
          <Card title="Deserción por curso" note="Cantidad, % sobre el total y en qué N° de clase desertan." >
            {!des.length ? <p className="text-sm text-on-surface-variant">Sin inscripciones.</p> : <ul className="space-y-5">{des.map((x) => (
              <li key={x.nombre}>
                <p className="flex justify-between text-sm font-semibold"><span>{x.nombre}</span><span>{x.d} de {x.total} · {x.p}%</span></p>
                {x.porClase.length > 0 && <p className="mt-1 text-xs text-on-surface-variant">Por clase: {x.porClase.map(([n, c]) => `clase ${n}: ${c}`).join(' · ')}</p>}
                {x.motivos.length > 0 && <details className="mt-1 text-xs text-on-surface-variant"><summary className="cursor-pointer text-secondary">Motivos</summary><ul className="mt-1 list-disc pl-5">{x.motivos.map((m, k) => <li key={k}>{m}</li>)}</ul></details>}
              </li>))}</ul>}
          </Card>
          <Card title="Velocidad de llenado" note="Días desde que se creó el curso hasta completar el cupo.">
            {llenos.length ? <ul className="mb-4 space-y-1 text-sm">{llenos.map((l) => <li key={l.nombre} className="flex justify-between"><span>{l.nombre}</span><span className="text-on-surface-variant">{l.dias} días</span></li>)}</ul> : <p className="mb-4 text-sm text-on-surface-variant">Ningún curso completó su cupo todavía.</p>}
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
      )}
    </>
  )
}
