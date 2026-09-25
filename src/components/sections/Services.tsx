import * as LucideIcons from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'

// ponytail: resolvemos el ícono por nombre contra todo lucide-react en vez de
// un mapa fijo de 20. Cualquier nombre PascalCase válido de Lucide funciona
// (Smartphone, Cpu, CircuitBoard, ...); ya no caen todos a Sparkles.
const resolveIcon = (name: string): React.ElementType =>
  (LucideIcons[name as keyof typeof LucideIcons] as React.ElementType) ?? LucideIcons.Sparkles

export default function Services() {
  const { content } = demoConfig

  return (
    <section id="services" className="section-pad" style={{ backgroundColor: 'var(--demo-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="eyebrow">Lo que hacemos</p>
          <h2 className="section-title">Nuestros servicios</h2>
          <p className="section-subtitle mt-4">
            Cada servicio está diseñado para darte la mejor experiencia y resultados que duran.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {content.services.map((service) => {
            const Icon = resolveIcon(service.icon)
            return (
              <div key={service.title} className="card flex flex-col gap-4 group cursor-default">
                <div
                  className="w-12 h-12 flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--demo-accent)',
                    borderRadius: 'var(--demo-radius)',
                  }}
                >
                  <Icon size={22} style={{ color: 'var(--demo-on-accent)' }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--demo-heading)' }}>
                    {service.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--demo-muted)' }}>
                    {service.description}
                  </p>
                </div>
                {service.price && (
                  <p className="text-lg font-bold mt-auto" style={{ color: 'var(--demo-accent)' }}>
                    {service.price}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
