'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Plus, X } from 'lucide-react'
import type { ActionState } from '@/lib/actions/auth'

const field =
  'flex flex-col gap-1.5'
const input =
  'px-4 py-2.5 border border-outline-variant rounded bg-surface-container text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-accent transition-colors'
const label = 'text-xs font-semibold uppercase tracking-wider text-on-surface-variant'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export type CursoFormValues = {
  id?: number
  titulo: string
  tipo: 'curso' | 'taller'
  area: 'tecnico' | 'diseno'
  descripcion: string
  requisitos: string
  dias_semana: number[]
  hora_inicio: string
  hora_fin: string
  aula: string
  fecha_inicio: string
  duracion_semanas: number
  profesor_id: string
  cupo_total: number
  precio: number
  precio_descuento: number | null
  publicado: boolean
  kit_items: KitItem[]
}

export type KitItem = { nombre: string; descripcion: string; precio: number; link: string }

// RF-45/46: kit de insumos por curso — lista dinámica, se manda como JSON en un
// input oculto (cursoSchema.parse en la Server Action espera un string JSON).
function KitItemsEditor({ initial }: { initial: KitItem[] }) {
  const [items, setItems] = useState<KitItem[]>(initial.length ? initial : [])

  function update(i: number, field: keyof KitItem, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: field === 'precio' ? Number(value) || 0 : value } : it)))
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="kit_items" value={JSON.stringify(items)} />
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_100px_1fr_auto] gap-2 items-center">
          <input value={it.nombre} onChange={(e) => update(i, 'nombre', e.target.value)} placeholder="Ítem (ej. Soldador)" className={input} />
          <input value={it.descripcion} onChange={(e) => update(i, 'descripcion', e.target.value)} placeholder="Descripción" className={input} />
          <input type="number" min={0} step="0.01" value={it.precio} onChange={(e) => update(i, 'precio', e.target.value)} placeholder="Precio" className={input} />
          <input value={it.link} onChange={(e) => update(i, 'link', e.target.value)} placeholder="Link de compra" className={input} />
          <button type="button" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-on-surface-variant hover:text-red-400 transition-colors">
            <X size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, { nombre: '', descripcion: '', precio: 0, link: '' }])}
        className="text-sm font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1"
      >
        <Plus size={16} /> Agregar ítem
      </button>
    </div>
  )
}

function SubmitButton({ label: text }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="py-3 px-8 text-sm font-semibold uppercase tracking-wide bg-accent text-white rounded transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? 'Guardando…' : text}
    </button>
  )
}

export function CursoForm({
  action,
  profesores,
  defaultValues,
  submitLabel,
  bloquearCalendario,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  profesores: { id: string; nombre: string; apellido: string }[]
  defaultValues?: Partial<CursoFormValues>
  submitLabel: string
  bloquearCalendario?: boolean
}) {
  const [state, formAction] = useFormState(action, {})
  const d = defaultValues ?? {}

  return (
    <form action={formAction} className="space-y-6">
      {defaultValues?.id && <input type="hidden" name="curso_id" value={defaultValues.id} />}
      {state.error && (
        <p role="alert" className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded px-4 py-2.5">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-on-surface bg-surface-container-high border border-outline-variant rounded px-4 py-2.5">
          {state.success}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <label className={field}>
          <span className={label}>Título</span>
          <input name="titulo" required defaultValue={d.titulo} className={input} placeholder="Reparación de iPhone" />
        </label>
        <label className={field}>
          <span className={label}>Tipo</span>
          <select name="tipo" defaultValue={d.tipo ?? 'curso'} className={input}>
            <option value="curso">Curso</option>
            <option value="taller">Taller</option>
          </select>
        </label>
        <label className={field}>
          <span className={label}>Área</span>
          <select name="area" defaultValue={d.area ?? 'tecnico'} className={input}>
            <option value="tecnico">Técnico</option>
            <option value="diseno">Diseño</option>
          </select>
        </label>
        <label className={field}>
          <span className={label}>Profesor</span>
          <select name="profesor_id" required defaultValue={d.profesor_id ?? ''} className={input}>
            <option value="" disabled>Elegir…</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
            ))}
          </select>
        </label>
      </div>

      <label className={field}>
        <span className={label}>Descripción</span>
        <textarea name="descripcion" required defaultValue={d.descripcion} rows={3} className={input} placeholder="Qué se aprende y para quién es" />
      </label>

      <label className={field}>
        <span className={label}>Requisitos previos</span>
        <textarea name="requisitos" defaultValue={d.requisitos} rows={2} className={input} />
      </label>

      <fieldset className={bloquearCalendario ? 'opacity-50 pointer-events-none' : ''}>
        <legend className={`${label} mb-2`}>Días de cursada {bloquearCalendario && '(no editable — regenera el calendario)'}</legend>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((nombre, i) => (
            <label key={i} className="flex items-center gap-1.5 text-sm text-on-surface bg-surface-container border border-outline-variant rounded px-3 py-1.5 cursor-pointer">
              <input type="checkbox" name="dias_semana" value={i} defaultChecked={d.dias_semana?.includes(i)} disabled={bloquearCalendario} />
              {nombre}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <label className={field}>
          <span className={label}>Hora inicio</span>
          <input type="time" name="hora_inicio" required defaultValue={d.hora_inicio} className={input} />
        </label>
        <label className={field}>
          <span className={label}>Hora fin</span>
          <input type="time" name="hora_fin" required defaultValue={d.hora_fin} className={input} />
        </label>
        <label className={field}>
          <span className={label}>Aula</span>
          <input name="aula" required defaultValue={d.aula} className={input} placeholder="Taller A" />
        </label>
        <label className={field}>
          <span className={label}>Cupo total</span>
          <input type="number" name="cupo_total" required min={1} defaultValue={d.cupo_total} className={input} />
        </label>
      </div>

      <div className={`grid sm:grid-cols-2 gap-4 ${bloquearCalendario ? 'opacity-50' : ''}`}>
        <label className={field}>
          <span className={label}>Fecha de inicio {bloquearCalendario && '(no editable)'}</span>
          <input type="date" name="fecha_inicio" required defaultValue={d.fecha_inicio} className={input} disabled={bloquearCalendario} />
        </label>
        <label className={field}>
          <span className={label}>Duración (semanas) {bloquearCalendario && '(no editable)'}</span>
          <input type="number" name="duracion_semanas" required min={1} defaultValue={d.duracion_semanas} className={input} disabled={bloquearCalendario} />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className={field}>
          <span className={label}>Precio</span>
          <input type="number" name="precio" required min={0} step="0.01" defaultValue={d.precio} className={input} />
        </label>
        <label className={field}>
          <span className={label}>Precio con descuento (opcional)</span>
          <input type="number" name="precio_descuento" min={0} step="0.01" defaultValue={d.precio_descuento ?? ''} className={input} />
        </label>
      </div>

      <div>
        <span className={`${label} block mb-2`}>Kit necesario (opcional)</span>
        <KitItemsEditor initial={d.kit_items ?? []} />
      </div>

      <label className="flex items-center gap-2 text-sm text-on-surface">
        <input type="checkbox" name="publicado" defaultChecked={d.publicado} /> Publicado en el sitio
      </label>

      <SubmitButton label={submitLabel} />
    </form>
  )
}
