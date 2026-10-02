'use client'

import { useState } from 'react'
import { ChevronDown, CheckCircle2 } from 'lucide-react'

export default function Accordion({ items }: { items: { id: string; n: string; title: string; items: string[] }[] }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="flex flex-col gap-3">
      {items.map((m, i) => {
        const isOpen = open === i
        return (
          <div key={m.id} className="card overflow-hidden">
            <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-container">
              <span className="flex items-center gap-4">
                <span className="font-mono text-xl font-bold text-accent">{m.n}</span>
                <span className="text-lg font-semibold">{m.title}</span>
              </span>
              <ChevronDown size={22} className={`shrink-0 text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <ul className="border-t border-outline-variant px-5 pb-4 pt-2">
                {m.items.map((it) => (
                  <li key={it} className="flex items-start gap-3 py-2 text-on-surface-variant"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" /> {it}</li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
