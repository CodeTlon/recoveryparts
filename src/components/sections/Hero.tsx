import Image from 'next/image'
import { demoConfig } from '@/lib/demo-config'

export default function Hero() {
  const { business, images } = demoConfig

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-16">
      {/* Imagen de fondo */}
      <div className="absolute inset-0">
        <Image
          src={images.hero}
          alt={business.name}
          fill
          className="object-cover"
          priority
          unoptimized={images.hero.startsWith('http')}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'var(--demo-structural)', opacity: 0.7 }}
        />
      </div>

      {/* Contenido */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--demo-accent)' }}>
          {business.address}
        </p>
        <h1
          className="text-5xl md:text-7xl font-bold leading-tight mb-6"
          style={{ color: 'var(--demo-on-structural)' }}
        >
          {business.name}
        </h1>
        <p className="text-xl md:text-2xl mb-10 opacity-90" style={{ color: 'var(--demo-on-structural)' }}>
          {business.tagline}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={`https://wa.me/${business.whatsapp}`}
            className="px-8 py-4 font-semibold text-lg transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--demo-accent)',
              color: 'var(--demo-on-accent)',
              borderRadius: 'var(--demo-radius)',
            }}
          >
            Reservar turno
          </a>
          <a
            href="#services"
            className="px-8 py-4 font-semibold text-lg border-2 transition-all hover:opacity-90"
            style={{
              borderColor: 'var(--demo-on-structural)',
              color: 'var(--demo-on-structural)',
              borderRadius: 'var(--demo-radius)',
            }}
          >
            Ver servicios
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="w-px h-12 animate-bounce" style={{ backgroundColor: 'var(--demo-accent)', opacity: 0.7 }} />
      </div>
    </section>
  )
}
