'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function FaqAccordion({ items }: { items: { id: number; pregunta: string; respuesta: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="flex flex-col gap-3 max-w-3xl mx-auto">
      {items.map((f, i) => {
        const isOpen = open === i
        return (
          <div key={f.id} className="bg-surface-container-low border border-outline-variant rounded overflow-hidden">
            <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-surface-container transition-colors">
              <h3 className="font-semibold text-on-surface">{f.pregunta}</h3>
              <ChevronDown size={20} className={`text-on-surface-variant transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <p className="px-6 pb-5 text-sm text-on-surface-variant">{f.respuesta}</p>}
          </div>
        )
      })}
    </div>
  )
}
