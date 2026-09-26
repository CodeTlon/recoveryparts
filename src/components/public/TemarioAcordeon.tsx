'use client'

import { useState } from 'react'
import { ChevronDown, CheckCircle2 } from 'lucide-react'

export function TemarioAcordeon({ modulos }: { modulos: { titulo: string; descripcion: string }[] }) {
  const [open, setOpen] = useState(0)
  if (!modulos.length) return <p className="text-on-surface-variant">Plan de estudios a confirmar.</p>

  return (
    <div className="flex flex-col gap-4">
      {modulos.map((m, i) => {
        const isOpen = open === i
        return (
          <div key={i} className="bg-surface-container-low border border-outline/30 rounded overflow-hidden">
            <button onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen} className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-surface-container transition-colors">
              <div className="flex items-center gap-4">
                <span className="text-accent font-mono text-xl font-bold">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="text-lg md:text-xl font-semibold text-on-surface">{m.titulo}</h3>
              </div>
              <ChevronDown size={22} className={`text-on-surface-variant transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && m.descripcion && (
              <div className="px-6 pb-6 pt-2 border-t border-outline/10 flex items-start gap-3 text-on-surface-variant">
                <CheckCircle2 size={18} className="text-primary mt-0.5 shrink-0" /> <span>{m.descripcion}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
