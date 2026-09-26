'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { actualizarTemaClaseAction, cambiarEstadoClaseAction } from '@/lib/actions/clases'
import type { ActionState } from '@/lib/actions/auth'

function GuardarButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="text-xs font-semibold uppercase tracking-wide bg-accent text-white rounded px-3 py-1.5 disabled:opacity-60 shrink-0">
      {pending ? '…' : 'Guardar'}
    </button>
  )
}

export function ClaseRow({
  claseId,
  cursoId,
  numero,
  fecha,
  tema,
  estado,
}: {
  claseId: number
  cursoId: number
  numero: number
  fecha: string
  tema: string
  estado: string
}) {
  const [temaState, temaAction] = useFormState(actualizarTemaClaseAction, {} as ActionState)
  const [estadoState, estadoAction] = useFormState(cambiarEstadoClaseAction, {} as ActionState)
  const [nuevaFecha, setNuevaFecha] = useState(fecha)

  return (
    <tr className="border-t border-outline-variant text-on-surface align-top">
      <td className="px-4 py-3 font-medium">#{numero}</td>
      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fecha}</td>
      <td className="px-4 py-3">
        <form action={temaAction} className="flex items-center gap-2">
          <input type="hidden" name="clase_id" value={claseId} />
          <input type="hidden" name="curso_id" value={cursoId} />
          <input name="tema" defaultValue={tema} placeholder="Tema de la clase" className="text-sm bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-on-surface placeholder:text-outline w-full min-w-[160px]" />
          <GuardarButton />
        </form>
        {temaState.error && <p className="text-xs text-red-400 mt-1">{temaState.error}</p>}
      </td>
      <td className="px-4 py-3">
        <form action={estadoAction} className="flex items-center gap-2 flex-wrap">
          <input type="hidden" name="clase_id" value={claseId} />
          <input type="hidden" name="curso_id" value={cursoId} />
          <select name="estado" defaultValue={estado} className="text-xs bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-on-surface">
            <option value="programada">Programada</option>
            <option value="suspendida">Suspendida</option>
            <option value="reprogramada">Reprogramada</option>
          </select>
          <input type="date" name="fecha" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className="text-xs bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-on-surface" />
          <GuardarButton />
        </form>
        {estadoState.error && <p className="text-xs text-red-400 mt-1">{estadoState.error}</p>}
      </td>
    </tr>
  )
}
