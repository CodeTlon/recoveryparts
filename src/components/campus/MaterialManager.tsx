'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Upload, Trash2, Zap } from 'lucide-react'
import { subirMaterialAction, liberarMaterialAction, eliminarMaterialAction } from '@/lib/actions/material'
import type { ActionState } from '@/lib/actions/auth'

const input = 'px-3 py-2 border border-outline-variant rounded bg-surface-container text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-accent transition-colors'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="py-2.5 px-5 text-sm font-semibold uppercase tracking-wide bg-accent text-white rounded transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center gap-2 shrink-0">
      <Upload size={16} /> {pending ? 'Subiendo…' : 'Subir'}
    </button>
  )
}

export type Material = { id: number; titulo: string; tipo: string; url: string | null; storage_path?: string | null; liberado_en: string | null }

export function MaterialManager({ cursoId, materiales }: { cursoId: number; materiales: Material[] }) {
  const [state, formAction] = useFormState(subirMaterialAction, {} as ActionState)

  return (
    <div className="space-y-4">
      <form action={formAction} className="bg-surface-container-low border border-outline-variant rounded-lg p-4 md:p-6 space-y-3">
        <input type="hidden" name="curso_id" value={cursoId} />
        {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
        {state.success && <p className="text-sm text-on-surface-variant">{state.success}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <input name="titulo" required placeholder="Título del material" className={input} />
          <select name="tipo" defaultValue="pdf" className={input}>
            <option value="pdf">PDF (archivo o link)</option>
            <option value="link">Link de video</option>
          </select>
        </div>
        <input name="archivo" type="file" accept="application/pdf" aria-label="Archivo PDF (máx. 25 MB)" className={`${input} w-full`} />
        <input name="url" type="url" placeholder="o pegá un link: https://… (obligatorio si es video)" className={`${input} w-full`} />
        <label className="flex items-center gap-2 text-sm text-on-surface">
          <input type="checkbox" name="liberar_ahora" defaultChecked /> Liberar ahora
        </label>
        <SubmitButton />
      </form>

      <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
              <th className="font-semibold px-4 py-3">Título</th>
              <th className="font-semibold px-4 py-3">Tipo</th>
              <th className="font-semibold px-4 py-3">Estado</th>
              <th className="font-semibold px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {materiales.map((m) => {
              const liberado = m.liberado_en && new Date(m.liberado_en) <= new Date()
              return (
                <tr key={m.id} className="border-t border-outline-variant text-on-surface">
                  <td className="px-4 py-3 font-medium">{m.titulo}</td>
                  <td className="px-4 py-3 text-on-surface-variant uppercase text-xs">{m.tipo}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${liberado ? 'bg-accent text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {liberado ? 'Liberado' : m.liberado_en ? `Programado: ${new Date(m.liberado_en).toLocaleString('es-AR')}` : 'Sin liberar'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!liberado && (
                        <form action={liberarMaterialAction.bind(null, m.id, cursoId)}>
                          <button type="submit" title="Liberar ahora" className="text-on-surface-variant hover:text-accent transition-colors"><Zap size={16} /></button>
                        </form>
                      )}
                      <form action={eliminarMaterialAction.bind(null, m.id, cursoId)}>
                        <button type="submit" title="Eliminar" className="text-on-surface-variant hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!materiales.length && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-on-surface-variant">Todavía no hay material cargado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
