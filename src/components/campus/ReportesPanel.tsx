import { requireRole } from '@/lib/auth'
import { AlertTriangle } from 'lucide-react'
import { DIAS, type Area } from '@/lib/types'
import { Empty } from '@/components/campus/ui'
import { Columnas, Partes, Stat, filasBarras } from '@/components/campus/charts'
import { hoyAR, etiquetaEdicion } from '@/lib/fechas'

type Insc = { alumno_id: string; edicion_id: string; estado: string; n_clase_desercion: number | null; motivo_desercion: string | null; creado_en: string; finalizado_el: string | null }
// Una fila por edición; `nombre` = «Curso · mes año». `curso_id`/`curso` agrupan las ediciones de un mismo curso.
type Curso = { id: string; curso_id: string; curso: string; nombre: string; cupo: number; creado_en: string; fecha_inicio: string | null; activo: boolean; horarios_curso: { dia_semana: number }[] }

const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0)
const num = (n: number) => n.toLocaleString('es-AR') // 33,3 (coma decimal)

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function Card({ title, note, className = '', children }: { title: string; note?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`card flex flex-col p-5 md:p-6 ${className}`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {note && <p className="mt-1 text-sm text-on-surface-variant">{note}</p>}
      <div className="mt-5 flex-1">{children}</div>
    </section>
  )
}

// Un grupo de reportes con su título (Inscripciones, Ocupación, Deserción, Demanda).
function Grupo({ titulo, mitades = false, children }: { titulo: string; mitades?: boolean; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="mt-10 first:mt-0">
      <h2 className="display mb-4 text-xl [font-stretch:105%]">{titulo}</h2>
      <div className={`grid gap-5 ${mitades ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>{children}</div>
    </section>
  )
}

const sinDatos = (t: string) => <p className="text-sm text-on-surface-variant">{t}</p>

// Lista larga: se ven las primeras `n` y el resto queda plegado («Ver 14 más»), para que un reporte no ocupe una
// pantalla entera cuando hay muchas ediciones.
function Recortar({ n = 5, className, items }: { n?: number; className: string; items: React.ReactNode[] }) {
  if (items.length <= n) return <ul className={className}>{items}</ul>
  return (
    <>
      <ul className={className}>{items.slice(0, n)}</ul>
      <details className="group mt-3">
        <summary className="cursor-pointer list-none py-2 text-sm font-semibold text-secondary [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Ver {items.length - n} más</span><span className="hidden group-open:inline">Ver menos</span>
        </summary>
        <ul className={`mt-2 ${className}`}>{items.slice(n)}</ul>
      </details>
    </>
  )
}

export default async function ReportesPanel({ area }: { area?: Area }) {
  const { sb } = await requireRole('admin')
  const [{ data: eds }, { data: insc }, { data: demanda }] = await Promise.all([
    sb.from('ediciones').select('id, curso_id, cupo, creado_en, fecha_inicio, activo, cursos(nombre, activo, area), horarios_curso(dia_semana)'),
    sb.from('inscripciones').select('alumno_id, edicion_id, estado, n_clase_desercion, motivo_desercion, creado_en, finalizado_el'),
    sb.from('demanda_cursos').select('interes'),
  ])
  const todas = ((eds ?? []) as unknown as (Omit<Curso, 'curso' | 'nombre'> & { cursos: { nombre: string; activo: boolean; area: Area } | null })[])
    .map((e) => ({ ...e, curso: e.cursos?.nombre ?? 'Curso', nombre: `${e.cursos?.nombre ?? 'Curso'} · ${etiquetaEdicion(e.fecha_inicio)}`, cursoActivo: !!e.cursos?.activo, area: e.cursos?.area }))
  // Se reporta sobre ediciones activas de cursos activos (del área elegida); `todas` sirve para ubicar el curso de
  // cualquier inscripción.
  const C: Curso[] = todas.filter((e) => e.activo && e.cursoActivo && (!area || e.area === area))
  const cursoDe = new Map(todas.map((e) => [e.id, e.curso_id]))
  const areaDeCurso = new Map(todas.map((e) => [e.curso_id, e.area]))
  const nombreCurso = new Map(todas.map((e) => [e.curso_id, e.curso]))
  const idsC = new Set(C.map((c) => c.id))
  const I = ((insc ?? []) as Insc[]).filter((i) => idsC.has(i.edicion_id))
  const nombre = (cursoId: string) => nombreCurso.get(cursoId) ?? 'Curso dado de baja'

  // Índices: se agrupa una vez en vez de filtrar todas las inscripciones por cada edición (era O(ediciones × inscripciones)).
  const porEdicion = new Map<string, Insc[]>()
  for (const i of I) { const l = porEdicion.get(i.edicion_id); if (l) l.push(i); else porEdicion.set(i.edicion_id, [i]) }
  const inscDe = (edicionId: string) => porEdicion.get(edicionId) ?? []
  const edicionPorId = new Map(C.map((c) => [c.id, c]))
  const hoy = hoyAR()

  // RF-48 · ocupación = inscriptos / cupo. «No se llena» = menos del 50 % y ya empezó.
  const ocup = C.map((c) => {
    const n = inscDe(c.id).length, p = pct(n, c.cupo)
    return { id: c.id, nombre: c.nombre, n, cupo: c.cupo, p, flojo: p < 50 && (!c.fecha_inicio || c.fecha_inicio <= hoy) }
  }).sort((a, b) => b.p - a.p)
  const flojos = ocup.filter((o) => o.flojo).length

  const estados = { activo: I.filter((i) => i.estado === 'activo').length, finalizado: I.filter((i) => i.estado === 'finalizado').length, desertor: I.filter((i) => i.estado === 'desertor').length }

  // Inscripciones por mes, últimos 12 meses (por fecha de alta).
  const [ay, am] = hoy.split('-').map(Number)
  const meses = Array.from({ length: 12 }, (_, k) => { const d = new Date(Date.UTC(ay, am - 12 + k, 1)); return { clave: d.toISOString().slice(0, 7), m: d.getUTCMonth(), y: d.getUTCFullYear() } })
  const porMes = new Map<string, number>()
  for (const i of I) { const k = i.creado_en.slice(0, 7); porMes.set(k, (porMes.get(k) ?? 0) + 1) }
  const ultimoMes = porMes.get(meses[11].clave) ?? 0

  // RF-48 · días con mayor deserción (día del curso donde hubo desertores)
  const diasDes = new Array(7).fill(0)
  for (const i of I) if (i.estado === 'desertor') edicionPorId.get(i.edicion_id)?.horarios_curso.forEach((h) => diasDes[h.dia_semana]++)

  // RF-49 · deserción por edición y por N° de clase. Solo las ediciones con desertores (las demás se cuentan aparte).
  const conInsc = C.filter((c) => inscDe(c.id).length > 0)
  const des = conInsc.map((c) => {
    const todos = inscDe(c.id), d = todos.filter((i) => i.estado === 'desertor')
    const porClase = new Map<number, number>(); d.forEach((i) => porClase.set(i.n_clase_desercion ?? 0, (porClase.get(i.n_clase_desercion ?? 0) ?? 0) + 1))
    return { id: c.id, nombre: c.nombre, total: todos.length, d: d.length, p: pct(d.length, todos.length), porClase: [...porClase.entries()].sort((a, b) => a[0] - b[0]), motivos: d.map((x) => x.motivo_desercion) }
  }).filter((x) => x.d > 0).sort((a, b) => b.p - a.p || b.d - a.d)

  // RF-50 · velocidad de llenado
  const llenos = C.map((c) => {
    const ord = inscDe(c.id).map((i) => i.creado_en).sort()
    return ord.length >= c.cupo ? { id: c.id, nombre: c.nombre, dias: Math.max(0, Math.round((+new Date(ord[c.cupo - 1]) - +new Date(c.creado_en)) / 864e5)) } : null
  }).filter(Boolean).sort((a, b) => a!.dias - b!.dias) as { id: string; nombre: string; dias: number }[]

  // RF-51 · qué curso eligen al terminar uno (otro curso, no otra edición del mismo)
  const sig = new Map<string, number>()
  // Una inscripción cuenta como «elegida al terminar» si se creó desde el día en que el alumno finalizó el otro curso
  // (antes se comparaba contra la fecha de alta del otro curso, y quien cursaba dos a la vez quedaba mal contado).
  const porAlumno = new Map<string, Insc[]>()
  for (const i of (insc ?? []) as Insc[]) { const l = porAlumno.get(i.alumno_id); if (l) l.push(i); else porAlumno.set(i.alumno_id, [i]) }
  for (const propias of porAlumno.values())
    for (const f of propias) {
      if (f.estado !== 'finalizado') continue
      const desde = f.finalizado_el ?? f.creado_en.slice(0, 10)
      for (const j of propias) {
        if (cursoDe.get(j.edicion_id) === cursoDe.get(f.edicion_id) || j.creado_en.slice(0, 10) < desde) continue
        const k = cursoDe.get(j.edicion_id); if (k && (!area || areaDeCurso.get(k) === area)) sig.set(k, (sig.get(k) ?? 0) + 1)
      }
    }
  const siguientes = [...sig.entries()].sort((a, b) => b[1] - a[1])

  // RF-52 · demanda de cursos que no se dictan. El pedido no tiene área: se muestra igual con cualquier filtro.
  const dem = new Map<string, number>(); (demanda ?? []).forEach((d) => { const k = d.interes.trim().toLowerCase(); dem.set(k, (dem.get(k) ?? 0) + 1) })
  const demanda_ = [...dem.entries()].sort((a, b) => b[1] - a[1])

  if (!C.length) return <Empty>{area ? 'No hay ediciones activas en esta área.' : 'Todavía no hay datos para reportar.'}</Empty>
  const ocupProm = ocup.length ? Math.round(ocup.reduce((a, o) => a + o.p, 0) / ocup.length) : 0
  const plural = (n: number, s: string, p = `${s}s`) => `${n} ${n === 1 ? s : p}`

  return (
    <>
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Inscripciones" value={I.length} note={`${estados.activo} cursando · ${estados.finalizado} finalizadas`} />
        <Stat label="Ocupación promedio" value={`${ocupProm} %`} medidor={{ valor: ocupProm, max: 100 }} note={`${plural(C.length, 'edición activa', 'ediciones activas')}`} />
        <Stat label="Deserción" value={`${num(pct(estados.desertor, I.length))} %`} note={`${estados.desertor} de ${I.length} inscripciones`} />
        <Stat label="Cupos completos" value={`${llenos.length} de ${C.length}`} note={flojos ? `${plural(flojos, 'edición', 'ediciones')} por debajo de la mitad` : 'Todas por encima de la mitad'} />
      </div>

      <Grupo titulo="Inscripciones">
        <Card title="Inscripciones por mes" note={`Altas de los últimos 12 meses. En ${MESES_LARGO[meses[11].m]}: ${ultimoMes}.`} className="lg:col-span-2">
          <Columnas titulo="Inscripciones por mes" data={meses.map((x) => ({ label: MESES[x.m], corto: MESES[x.m][0], largo: `${MESES_LARGO[x.m]} ${x.y}`, valor: porMes.get(x.clave) ?? 0 }))} />
        </Card>
        <Card title="Estado de las inscripciones" note={`${I.length} en total.`}>
          <Partes titulo="Estado de las inscripciones" data={[
            { label: 'Finalizadas', valor: estados.finalizado, color: 'bg-dato-fin' },
            { label: 'Cursando', valor: estados.activo, color: 'bg-dato-curso' },
            { label: 'Desertores', valor: estados.desertor, color: 'bg-dato-baja' },
          ]} />
        </Card>
      </Grupo>

      <Grupo titulo="Ocupación">
        <Card title="Ocupación por edición" note="Inscriptos sobre el cupo. La línea marca el 50 %." className="lg:col-span-2">
          <Recortar n={6} className="space-y-4" items={filasBarras(ocup.map((o) => ({
            id: o.id, valor: o.p,
            label: <>{o.nombre}{o.flojo && <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-warning/15 px-2 py-0.5 align-middle text-xs font-semibold text-warning"><AlertTriangle size={12} aria-hidden /> No se llena</span>}</>,
            texto: <>{o.n}/{o.cupo} · <span className="font-semibold text-on-surface">{num(o.p)} %</span></>,
          })), { max: 100, umbral: 50 })} />
        </Card>
        <Card title="Velocidad de llenado" note="Días desde que se creó la edición hasta completar el cupo. Menos es mejor.">
          {llenos.length ? <Recortar className="space-y-4" items={filasBarras(llenos.map((l) => ({ id: l.id, label: l.nombre, valor: l.dias, texto: l.dias ? plural(l.dias, 'día') : 'El mismo día' })))} /> : sinDatos('Ninguna edición completó su cupo todavía.')}
        </Card>
      </Grupo>

      <Grupo titulo="Deserción">
        <Card title="Deserción por edición" note={`Porcentaje sobre los inscriptos y en qué clase dejaron.${conInsc.length > des.length ? ` ${plural(conInsc.length - des.length, 'edición', 'ediciones')} sin desertores.` : ''}`} className="lg:col-span-2">
          {!des.length ? sinDatos('Ninguna edición tiene desertores.') : <Recortar className="space-y-5" items={filasBarras(des.map((x) => ({
            id: x.id, label: x.nombre, valor: x.p,
            texto: <>{x.d} de {x.total} · <span className="font-semibold text-on-surface">{num(x.p)} %</span></>,
            extra: (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
                {x.porClase.map(([n, c]) => <span key={n} className="rounded-full bg-surface-container-high px-2 py-0.5 tabular-nums">{n ? `Clase ${n}` : 'Sin clase'}: {c}</span>)}
                {x.motivos.some(Boolean) && (
                  <details className="w-full">
                    <summary className="-my-1 inline-block cursor-pointer py-2 font-semibold text-secondary">Ver motivos</summary>
                    <ul className="mt-1 list-disc space-y-1 pl-5">{x.motivos.filter(Boolean).map((m, k) => <li key={k}>{m}</li>)}</ul>
                  </details>
                )}
              </div>
            ),
          })), { max: 100, color: 'bg-dato-baja' })} />}
        </Card>
        <Card title="Días con más deserción" note="Desertores según el día de cursada.">
          {estados.desertor ? <Columnas titulo="Desertores por día de cursada" data={DIAS.map((d, i) => ({ label: d.slice(0, 3), largo: d, valor: diasDes[i] }))} /> : sinDatos('Sin desertores.')}
        </Card>
      </Grupo>

      <Grupo titulo="Demanda" mitades>
        <Card title="Qué eligen al terminar un curso" note="Cursos en los que se inscriben los alumnos que finalizaron otro." >
          {siguientes.length ? <Recortar className="space-y-4" items={filasBarras(siguientes.map(([id, n]) => ({ id, label: nombre(id), valor: n, texto: plural(n, 'alumno') })))} /> : sinDatos('Todavía no hay datos.')}
        </Card>
        <Card title="Cursos que piden y no se dictan" note={`Pedidos registrados desde el buscador del sitio${area ? ' (de todas las áreas: el pedido no tiene área)' : ''}.`} >
          {demanda_.length ? <Recortar className="space-y-4" items={filasBarras(demanda_.map(([k, n]) => ({ id: k, label: <span className="capitalize">{k}</span>, valor: n, texto: plural(n, 'pedido') })))} /> : sinDatos('Todavía no hay pedidos.')}
        </Card>
      </Grupo>
    </>
  )
}
