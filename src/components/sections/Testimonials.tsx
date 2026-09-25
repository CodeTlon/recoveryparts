import Image from 'next/image'
import { Star } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'

export default function Testimonials() {
  const { content } = demoConfig

  return (
    <section id="testimonials" className="section-pad" style={{ backgroundColor: 'var(--demo-surface)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="eyebrow">Lo que dicen</p>
          <h2 className="section-title">Clientes que confían en nosotros</h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {content.testimonials.map((t) => (
            <div key={t.name} className="card flex flex-col gap-5" style={{ backgroundColor: 'var(--demo-surface-alt)' }}>
              {/* Estrellas */}
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i < t.rating ? 'var(--demo-accent)' : 'transparent'}
                    style={{ color: 'var(--demo-accent)' }}
                  />
                ))}
              </div>

              {/* Texto */}
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--demo-text)' }}>
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Avatar + nombre */}
              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--demo-border)' }}>
                {t.avatar ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      fill
                      className="object-cover"
                      unoptimized={t.avatar.startsWith('http')}
                    />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ backgroundColor: 'var(--demo-accent)', color: 'var(--demo-on-accent)' }}
                  >
                    {t.name[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--demo-heading)' }}>{t.name}</p>
                  {t.role && <p className="text-xs" style={{ color: 'var(--demo-muted)' }}>{t.role}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
