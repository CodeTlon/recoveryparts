'use client'

import { useState } from 'react'

// Cuánto ocupa una foto en la grilla, elegido sobre cuadraditos (de SpanPicker de inglobal-site): se ve de un
// vistazo qué es fila, qué es columna y qué queda libre alrededor. Tocar un cuadradito = ocupar hasta ahí.
export function TamanoGrilla({ label, colsName, filasName, maxCols, maxFilas, cols: c0 = 1, filas: f0 = 1 }: {
  label: string; colsName: string; filasName: string; maxCols: number; maxFilas: number; cols?: number; filas?: number
}) {
  const [cols, setCols] = useState(c0)
  const [filas, setFilas] = useState(f0)
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <input type="hidden" name={colsName} value={cols} />
      <input type="hidden" name={filasName} value={filas} />
      <div className="inline-grid gap-1 rounded-lg border border-outline-variant bg-surface-container/50 p-2" style={{ gridTemplateColumns: `repeat(${maxCols}, 2rem)` }}>
        {Array.from({ length: maxFilas }, (_, f) => Array.from({ length: maxCols }, (_, c) => {
          const ocupa = c < cols && f < filas
          return (
            <button key={`${f}-${c}`} type="button" aria-pressed={c + 1 === cols && f + 1 === filas} aria-label={`${c + 1} columna${c ? 's' : ''} × ${f + 1} fila${f ? 's' : ''}`}
              onClick={() => { setCols(c + 1); setFilas(f + 1) }}
              className={`h-8 w-8 rounded border transition-colors ${ocupa ? 'border-accent bg-accent/70' : 'border-outline-variant bg-surface-container-high hover:border-accent/60'}`} />
          )
        }))}
      </div>
      <p className="mt-1 text-xs text-on-surface-variant">{cols} columna{cols > 1 ? 's' : ''} × {filas} fila{filas > 1 ? 's' : ''}</p>
    </fieldset>
  )
}
