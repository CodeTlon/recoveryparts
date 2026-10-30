// Gráficos de los reportes, sin librerías y sin JS en el cliente: el servidor arma el HTML y el CSS anima la entrada
// (se apaga con prefers-reduced-motion). Reglas (design.md § Gráficos): marcas finas, una sola serie = un solo color
// (`bg-dato`), estados con su color fijo (`dato-fin`, `dato-curso`, `dato-baja`), los números siempre en color de
// texto y escritos al lado de la marca (nunca solo el color o un tooltip). Cada gráfico tiene `aria-label` con los datos.

export type Parte = { label: string; valor: number; color: string } // color = clase bg-*, ej. 'bg-dato-fin'

const pct = (v: number, total: number) => (total ? Math.round((100 * v) / total) : 0)

// Barra fina con pista. `umbral` (0-100) dibuja una marca vertical, ej. el 50 % de ocupación.
export function Medidor({ valor, max, umbral, color = 'bg-dato', alto = 'h-2' }: { valor: number; max: number; umbral?: number; color?: string; alto?: string }) {
  const p = max ? Math.min(100, (100 * valor) / max) : 0
  return (
    <div aria-hidden className={`relative w-full rounded-full bg-dato/15 ${alto}`}>
      {p > 0 && <div className={`crece-x h-full rounded-full ${color}`} style={{ width: `${Math.max(p, 1.5)}%` }} />}
      {umbral != null && <span className="absolute -inset-y-1 w-px bg-on-surface-variant/70" style={{ left: `${umbral}%` }} />}
    </div>
  )
}

// Lista de barras horizontales: etiqueta a la izquierda, valor a la derecha, barra debajo. Para rankings
// (ocupación, demanda, qué eligen). `max` fijo (ej. 100 para porcentajes) o el mayor de la lista.
export type FilaBarra = { id: string; label: React.ReactNode; valor: number; texto?: React.ReactNode; extra?: React.ReactNode }
export function filasBarras(filas: FilaBarra[], { max, umbral, color }: { max?: number; umbral?: number; color?: string } = {}) {
  const tope = max ?? Math.max(1, ...filas.map((f) => f.valor))
  return filas.map((f) => (
    <li key={f.id}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0">{f.label}</span>
        <span className="shrink-0 tabular-nums text-on-surface-variant">{f.texto ?? f.valor}</span>
      </div>
      <Medidor valor={f.valor} max={tope} umbral={umbral} color={color} />
      {f.extra}
    </li>
  ))
}

// Columnas verticales con el valor sobre cada una (días de la semana, meses). Columnas de 24 px como máximo,
// esquina redondeada solo arriba y una línea de base. Un cero no dibuja columna: queda la base.
export function Columnas({ data, unidad = '', titulo, destacarMax = true }: { data: { label: string; valor: number; largo?: string; corto?: string }[]; unidad?: string; titulo: string; destacarMax?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.valor))
  const top = Math.max(...data.map((d) => d.valor))
  return (
    <div role="img" aria-label={`${titulo}: ${data.map((d) => `${d.largo ?? d.label} ${d.valor}${unidad}`).join(', ')}`}>
      <div className="flex h-36 items-end gap-1 border-b border-outline-variant">
        {data.map((d) => (
          <div key={d.label} title={`${d.largo ?? d.label}: ${d.valor}${unidad}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            {d.valor > 0 && <span className={`mb-1 text-xs tabular-nums ${destacarMax && d.valor === top ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>{d.valor}{unidad}</span>}
            {d.valor > 0 && <div className="crece-y w-full max-w-6 rounded-t-[4px] bg-dato" style={{ height: `${(d.valor / max) * 100}%` }} />}
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-1.5 flex gap-1">
        {data.map((d) => <span key={d.label} className="min-w-0 flex-1 truncate text-center text-xs text-on-surface-variant">{d.corto ? <><span className="sm:hidden">{d.corto}</span><span className="hidden sm:inline">{d.label}</span></> : d.label}</span>)}
      </div>
    </div>
  )
}

// Parte de un todo en una sola barra (reemplaza al anillo): segmentos separados por 2 px y leyenda con cantidad y %.
export function Partes({ data, titulo }: { data: Parte[]; titulo: string }) {
  const total = data.reduce((a, d) => a + d.valor, 0)
  return (
    <div>
      <div role="img" aria-label={`${titulo}: ${data.map((d) => `${d.label} ${d.valor} (${pct(d.valor, total)}%)`).join(', ')}`} className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-dato/15">
        {data.filter((d) => d.valor > 0).map((d) => (
          <div key={d.label} title={`${d.label}: ${d.valor}`} className={`crece-x h-full first:rounded-l-full last:rounded-r-full ${d.color}`} style={{ flexGrow: d.valor, flexBasis: 0 }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5">
            <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${d.color}`} />
            <span>{d.label}</span>
            <span className="ml-auto tabular-nums font-semibold">{d.valor}</span>
            <span className="w-10 text-right tabular-nums text-xs text-on-surface-variant">{pct(d.valor, total)} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Indicador grande (KPI) con nota opcional y, si se pasa `medidor`, una barra fina debajo (ej. ocupación promedio).
export function Stat({ label, value, note, medidor }: { label: string; value: React.ReactNode; note?: string; medidor?: { valor: number; max: number } }) {
  return (
    <div className="card flex h-full flex-col p-5">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="display mt-2 text-3xl md:text-4xl">{value}</p>
      {medidor && <div className="mt-3"><Medidor valor={medidor.valor} max={medidor.max} alto="h-1.5" /></div>}
      {note && <p className="mt-auto pt-2 text-xs text-on-surface-variant">{note}</p>}
    </div>
  )
}
