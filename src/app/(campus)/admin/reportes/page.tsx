import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

type Curso = { id: number; titulo: string; cupo_total: number; created_at: string }
type Matricula = { curso_id: number; estado: string; created_at: string; fecha_desercion: string | null; n_clase_desercion: number | null }

export default async function ReportesPage() {
  await requireAdmin()
  const supabase = await createClient()

  // RF-52: demanda de cursos que aún no se dictan (se agrupa por texto normalizado).
  const { data: demandaRows } = await supabase.from('demanda_cursos').select('interes')
  const demandaMap = new Map<string, number>()
  for (const d of demandaRows ?? []) {
    const k = d.interes.trim().toLowerCase()
    demandaMap.set(k, (demandaMap.get(k) ?? 0) + 1)
  }
  const demanda = [...demandaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)

  const [{ data: cursosData }, { data: matriculasData }] = await Promise.all([
    supabase.from('cursos').select('id, titulo, cupo_total, created_at').neq('estado', 'de_baja'),
    supabase.from('matriculas').select('curso_id, estado, created_at, fecha_desercion, n_clase_desercion'),
  ])
  const cursos = (cursosData ?? []) as Curso[]
  const matriculas = (matriculasData ?? []) as Matricula[]

  const porCurso = new Map<number, Matricula[]>()
  for (const m of matriculas) porCurso.set(m.curso_id, [...(porCurso.get(m.curso_id) ?? []), m])

  // RF-48: ocupación por curso.
  const ocupacion = cursos.map((c) => {
    const ms = porCurso.get(c.id) ?? []
    const activos = ms.filter((m) => m.estado === 'activo').length
    return { curso: c.titulo, activos, cupo: c.cupo_total, pct: c.cupo_total ? Math.round((activos / c.cupo_total) * 100) : 0 }
  })

  // RF-49: deserción por curso + distribución por n° de clase.
  const desercion = cursos.map((c) => {
    const ms = porCurso.get(c.id) ?? []
    const desertores = ms.filter((m) => m.estado === 'desertor')
    const distribucion = new Map<number, number>()
    for (const d of desertores) {
      if (d.n_clase_desercion == null) continue
      distribucion.set(d.n_clase_desercion, (distribucion.get(d.n_clase_desercion) ?? 0) + 1)
    }
    return {
      curso: c.titulo,
      total: ms.length,
      desertores: desertores.length,
      pct: ms.length ? Math.round((desertores.length / ms.length) * 100) : 0,
      distribucion: [...distribucion.entries()].sort((a, b) => a[0] - b[0]),
    }
  }).filter((d) => d.total > 0)

  // Día de la semana con más deserciones (sobre fecha_desercion), agregado global.
  const porDia = new Array(7).fill(0)
  for (const m of matriculas) {
    if (m.estado === 'desertor' && m.fecha_desercion) {
      porDia[new Date(`${m.fecha_desercion}T12:00:00`).getDay()] += 1
    }
  }
  const maxDesercionesDia = Math.max(...porDia)
  const diaTop = maxDesercionesDia > 0 ? DIAS[porDia.indexOf(maxDesercionesDia)] : null

  // RF-50: velocidad de llenado — días entre la creación del curso y la
  // matrícula que llegó al cupo (si ya se llenó alguna vez).
  const velocidad = cursos.map((c) => {
    const activas = (porCurso.get(c.id) ?? [])
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
    const seLleno = activas.length >= c.cupo_total
    const dias = seLleno
      ? Math.round((new Date(activas[c.cupo_total - 1].created_at).getTime() - new Date(c.created_at).getTime()) / 86_400_000)
      : null
    return { curso: c.titulo, dias, inscriptos: activas.length, cupo: c.cupo_total }
  }).sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity))

  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">Reportes</h1>
        <p className="text-lg text-on-surface-variant">Ocupación, deserción y velocidad de llenado.</p>
      </header>

      {diaTop && (
        <p className="mb-8 text-sm text-on-surface bg-surface-container-high border border-outline-variant rounded px-4 py-3">
          El día con más deserciones registradas es <strong>{diaTop}</strong> ({maxDesercionesDia}).
        </p>
      )}

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-on-surface mb-4">Ocupación por curso</h2>
        <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
                <th className="font-semibold px-4 py-3">Curso</th>
                <th className="font-semibold px-4 py-3">Ocupación</th>
              </tr>
            </thead>
            <tbody>
              {ocupacion.map((o) => (
                <tr key={o.curso} className="border-t border-outline-variant text-on-surface">
                  <td className="px-4 py-3 font-medium">{o.curso}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{o.activos}/{o.cupo} ({o.pct}%)</td>
                </tr>
              ))}
              {!ocupacion.length && <tr><td colSpan={2} className="px-4 py-6 text-center text-on-surface-variant">Sin datos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-on-surface mb-4">Deserción por curso</h2>
        <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
                <th className="font-semibold px-4 py-3">Curso</th>
                <th className="font-semibold px-4 py-3">Desertores</th>
                <th className="font-semibold px-4 py-3">Distribución por clase</th>
              </tr>
            </thead>
            <tbody>
              {desercion.map((d) => (
                <tr key={d.curso} className="border-t border-outline-variant text-on-surface align-top">
                  <td className="px-4 py-3 font-medium">{d.curso}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{d.desertores}/{d.total} ({d.pct}%)</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {d.distribucion.length ? d.distribucion.map(([n, c]) => `Clase ${n}: ${c}`).join(' · ') : '—'}
                  </td>
                </tr>
              ))}
              {!desercion.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-on-surface-variant">Sin datos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-on-surface mb-4">Velocidad de llenado</h2>
        <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
                <th className="font-semibold px-4 py-3">Curso</th>
                <th className="font-semibold px-4 py-3">Se llenó en</th>
              </tr>
            </thead>
            <tbody>
              {velocidad.map((v) => (
                <tr key={v.curso} className="border-t border-outline-variant text-on-surface">
                  <td className="px-4 py-3 font-medium">{v.curso}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{v.dias != null ? `${v.dias} días` : `No se llenó (${v.inscriptos}/${v.cupo})`}</td>
                </tr>
              ))}
              {!velocidad.length && <tr><td colSpan={2} className="px-4 py-6 text-center text-on-surface-variant">Sin datos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-1 text-xl md:text-2xl font-semibold text-on-surface">Demanda de cursos que aún no se dictan</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Pedidos registrados desde el buscador del sitio (RF-52).</p>
        <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
          <table className="w-full min-w-[320px] text-sm">
            <thead><tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider"><th className="font-semibold px-4 py-3">Curso pedido</th><th className="font-semibold px-4 py-3">Pedidos</th></tr></thead>
            <tbody>
              {demanda.map(([k, n]) => (
                <tr key={k} className="border-t border-outline-variant text-on-surface"><td className="px-4 py-3 capitalize">{k}</td><td className="px-4 py-3 text-on-surface-variant">{n}</td></tr>
              ))}
              {!demanda.length && <tr><td colSpan={2} className="px-4 py-6 text-center text-on-surface-variant">Todavía no hay pedidos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
