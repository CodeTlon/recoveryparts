import { demoConfig } from '@/lib/demo-config'

export default function Stats() {
  const { content } = demoConfig

  return (
    <section id="stats" className="py-16" style={{ backgroundColor: 'var(--demo-structural)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {content.stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: 'var(--demo-accent)' }}>
                {stat.value}
              </div>
              <div
                className="text-sm uppercase tracking-widest font-medium"
                style={{ color: 'var(--demo-on-structural)', opacity: 0.6 }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
