import { CheckCircle2 } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'

export default function Pricing() {
  const { content } = demoConfig

  return (
    <section id="pricing" className="section-pad" style={{ backgroundColor: 'var(--demo-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="eyebrow">Planes y precios</p>
          <h2 className="section-title">Elegí tu plan</h2>
          <p className="section-subtitle mt-4">
            Opciones para cada necesidad, siempre con la calidad que nos caracteriza.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {content.pricing.map((plan) => {
            const heading = plan.highlighted ? 'var(--demo-on-structural)' : 'var(--demo-heading)'
            const body = plan.highlighted ? 'var(--demo-on-structural)' : 'var(--demo-muted)'
            return (
              <div
                key={plan.name}
                className="card relative p-8 flex flex-col gap-6 hover:-translate-y-1"
                style={
                  plan.highlighted
                    ? { backgroundColor: 'var(--demo-structural)', borderColor: 'var(--demo-accent)' }
                    : undefined
                }
              >
                {plan.highlighted && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: 'var(--demo-accent)',
                      color: 'var(--demo-on-accent)',
                      borderRadius: 'var(--demo-radius)',
                    }}
                  >
                    Más popular
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-xl mb-1" style={{ color: heading }}>{plan.name}</h3>
                  <p className="text-sm" style={{ color: body, opacity: plan.highlighted ? 0.7 : 1 }}>
                    {plan.description}
                  </p>
                </div>

                <div>
                  <span className="text-4xl font-bold" style={{ color: 'var(--demo-accent)' }}>
                    {plan.price}
                  </span>
                </div>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={16} style={{ color: 'var(--demo-accent)', flexShrink: 0 }} />
                      <span style={{ color: body, opacity: plan.highlighted ? 0.9 : 1 }}>{feat}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={`https://wa.me/${demoConfig.business.whatsapp}`}
                  className="mt-auto text-center py-3 px-6 font-semibold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--demo-accent)',
                    color: 'var(--demo-on-accent)',
                    borderRadius: 'var(--demo-radius)',
                  }}
                >
                  Consultar
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
