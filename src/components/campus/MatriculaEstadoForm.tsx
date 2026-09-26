'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { cambiarEstadoMatriculaAction } from '@/lib/actions/matriculas'
import type { ActionState } from '@/lib/actions/auth'

const ESTADOS = [
  { value: 'activo', label: 'Activo' },
  { value: 'suspendido', label: 'Suspendido' },
  { value: 'desertor', label: 'Desertor' },
  { value: 'inactivo', label: 'Inactivo' },
] as const

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="text-xs font-semibold uppercase tracking-wide bg-accent text-white rounded px-3 py-1.5 disabled:opacity-60">
      {pending ? 'Guardando…' : 'Guardar'}
    </button>
  )
}

export function MatriculaEstadoForm({
  matriculaId,
  cursoId,
  estadoActual,
  soloDesertor,
}: {
  matriculaId: number
  cursoId: number
  estadoActual: string
  soloDesertor?: boolean
}) {
  const [state, formAction] = useFormState(cambiarEstadoMatriculaAction, {} as ActionState)
  const [estado, setEstado] = useState(estadoActual)
  const requiereMotivo = estado === 'desertor' || estado === 'inactivo'

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="matricula_id" value={matriculaId} />
      <input type="hidden" name="curso_id" value={cursoId} />
      <div className="flex items-center gap-2 flex-wrap">
        <select
          name="estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="text-xs bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-on-surface"
        >
          {ESTADOS.filter((e) => !soloDesertor || e.value === 'desertor' || e.value === estadoActual).map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
        {requiereMotivo && (
          <input type="date" name="fecha_desercion" defaultValue={new Date().toISOString().slice(0, 10)} className="text-xs bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-on-surface" />
        )}
        <SubmitButton />
      </div>
      {requiereMotivo && (
        <input name="motivo_baja" required placeholder="Motivo (obligatorio)" className="text-xs bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-on-surface placeholder:text-outline w-full" />
      )}
      {state.error && <p role="alert" className="text-xs text-red-400">{state.error}</p>}
    </form>
  )
}
