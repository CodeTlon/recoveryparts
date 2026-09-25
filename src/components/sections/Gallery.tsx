import Image from 'next/image'
import { demoConfig } from '@/lib/demo-config'

export default function Gallery() {
  const { images, business } = demoConfig

  return (
    <section id="gallery" className="section-pad" style={{ backgroundColor: 'var(--demo-surface)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="eyebrow">Nuestro trabajo</p>
          <h2 className="section-title">Galería</h2>
          <p className="section-subtitle mt-4">
            Una muestra de los resultados que logramos con cada cliente.
          </p>
        </div>

        {/* Grid de fotos */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.gallery.map((src, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden group cursor-pointer"
              style={{ borderRadius: 'var(--demo-radius)' }}
            >
              <Image
                src={src}
                alt={`${business.name} — trabajo ${i + 1}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                unoptimized={src.startsWith('http')}
              />
              {/* Overlay hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-60 transition-opacity duration-300"
                style={{ backgroundColor: 'var(--demo-structural)' }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--demo-accent)' }}
                >
                  <span style={{ color: 'var(--demo-on-accent)', fontSize: 20 }}>+</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
