// Gráficos SVG livianos para los reportes (sin librerías). Server components: el SVG se renderiza
// en el servidor y no suma JS al cliente. Los colores salen del tema (clases de Tailwind).

export type Slice = { label: string; value: number; color: string } // color = clase de fill/bg, ej. 'text-accent'

// Anillo con un total al centro y leyenda. `color` usa currentColor vía clases text-*.
export function Donut({ data, center, caption }: { data: Slice[]; center: React.ReactNode; caption?: string }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  const R = 42, C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`${caption ?? 'Gráfico'}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="11" className="stroke-surface-container-highest" />
          {total > 0 && data.filter((d) => d.value > 0).map((d) => {
            const len = (d.value / total) * C
            const el = <circle key={d.label} cx="50" cy="50" r={R} fill="none" strokeWidth="11" strokeDasharray={`${Math.max(len - 1.5, 0)} ${C}`} strokeDashoffset={-acc} className={`stroke-current ${d.color}`} />
            acc += len
            return el
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
      </div>
      <ul className="space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span aria-hidden className={`h-3 w-3 rounded-sm bg-current ${d.color}`} />
            <span>{d.label}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums">{d.value}{total > 0 && <span className="ml-1 text-xs font-normal text-on-surface-variant">({Math.round((100 * d.value) / total)}%)</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Columnas verticales con el valor arriba. Para pocas categorías (días de la semana, N° de clase).
export function Columns({ data, unit = '', color = 'bg-accent' }: { data: { label: string; value: number }[]; unit?: string; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex h-44 items-end gap-2" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}${unit}`).join(', ')}>
      {data.map((d) => (
        <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
          <span className="mb-1 text-xs font-semibold tabular-nums">{d.value}{unit}</span>
          <div className={`w-full rounded-t ${d.value ? color : 'bg-surface-container-highest'}`} style={{ height: `${d.value ? Math.max((d.value / max) * 100, 4) : 2}%` }} />
          <span className="mt-1 truncate text-[11px] text-on-surface-variant">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// Indicador grande (KPI) con nota opcional.
export function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-primary">{value}</p>
      {note && <p className="mt-1 text-xs text-on-surface-variant">{note}</p>}
    </div>
  )
}
