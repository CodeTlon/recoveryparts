import { FileText, Link2 } from 'lucide-react'
import { Badge } from '@/components/campus/ui'

// Árbol de solo lectura del curso: Módulo → Clase (teórica/práctica) → Material (RF-26, RF-31).
// En talleres no hay módulos: las clases van sueltas. Marca las clases sin material.
export type ArbolModulo = { id: string; titulo: string; orden: number }
export type ArbolClase = { id: string; numero: number; titulo: string; tipo: 'teorica' | 'practica'; modulo_id: string | null }
export type ArbolMaterial = { id: string; titulo: string; tipo: 'pdf' | 'link'; plan_clase_id: string | null }

export const TIPO_CLASE = { teorica: 'Teórica', practica: 'Práctica' } as const

export default function ArbolEstructura<M extends ArbolMaterial>({ modulos, clases, materiales, renderMaterial }: {
  modulos: ArbolModulo[]; clases: ArbolClase[]; materiales: M[]
  renderMaterial?: (m: M) => React.ReactNode // por defecto: título y tipo
}) {
  const porClase = (id: string | null) => materiales.filter((m) => m.plan_clase_id === id)
  const item = (m: M) => renderMaterial ? renderMaterial(m) : (
    <span className="flex items-center gap-2">{m.tipo === 'pdf' ? <FileText size={14} aria-hidden /> : <Link2 size={14} aria-hidden />}{m.titulo}</span>
  )
  const fila = (c: ArbolClase) => {
    const ms = porClase(c.id)
    return (
      <li key={c.id} className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-7 text-sm font-semibold text-on-surface-variant">{c.numero}</span>
          <span className="flex-1 font-medium">{c.titulo}</span>
          <Badge tone={c.tipo === 'practica' ? 'warn' : 'neutral'}>{TIPO_CLASE[c.tipo]}</Badge>
          {!ms.length && <Badge>Sin material</Badge>}
        </div>
        {ms.length > 0 && <ul className="mt-2 space-y-1 pl-9 text-sm">{ms.map((m) => <li key={m.id}>{item(m)}</li>)}</ul>}
      </li>
    )
  }
  const sueltas = clases.filter((c) => !c.modulo_id || !modulos.some((m) => m.id === c.modulo_id))
  const generales = porClase(null)
  if (!clases.length && !generales.length) return <p className="text-sm text-on-surface-variant">Todavía no hay clases cargadas.</p>
  return (
    <div className="space-y-4">
      {modulos.map((m, i) => (
        <section key={m.id} className="card">
          <h3 className="border-b border-outline-variant px-4 py-3 font-semibold">Módulo {i + 1} · {m.titulo}</h3>
          <ul className="divide-y divide-outline-variant">{clases.filter((c) => c.modulo_id === m.id).map(fila)}</ul>
        </section>
      ))}
      {sueltas.length > 0 && (
        <section className="card">
          {modulos.length > 0 && <h3 className="border-b border-outline-variant px-4 py-3 font-semibold">Sin módulo</h3>}
          <ul className="divide-y divide-outline-variant">{sueltas.map(fila)}</ul>
        </section>
      )}
      {generales.length > 0 && (
        <section className="card">
          <h3 className="border-b border-outline-variant px-4 py-3 font-semibold">Material general <span className="text-sm font-normal text-on-surface-variant">(sin clase)</span></h3>
          <ul className="space-y-1 p-4 text-sm">{generales.map((m) => <li key={m.id}>{item(m)}</li>)}</ul>
        </section>
      )}
    </div>
  )
}
