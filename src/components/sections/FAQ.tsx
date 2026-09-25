'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'

export default function FAQ() {
  const { content } = demoConfig
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="section-pad" style={{ backgroundColor: 'var(--demo-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="eyebrow">Dudas frecuentes</p>
          <h2 className="section-title">Preguntas frecuentes</h2>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {content.faq.map((item, i) => {
            const isOpen = open === i
            return (
              <div
                key={i}
                className="overflow-hidden border"
                style={{ borderColor: 'var(--demo-border)', borderRadius: 'var(--demo-radius)' }}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left font-semibold"
                  style={{ backgroundColor: isOpen ? 'var(--demo-surface)' : 'transparent', color: 'var(--demo-heading)' }}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--demo-accent)' }}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 py-5 text-sm leading-relaxed" style={{ color: 'var(--demo-muted)' }}>
                    {item.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
