import { MessageCircle, ArrowRight } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'

export default function CTA() {
  const { business, content } = demoConfig
  const cta = (content as { cta?: { title?: string; subtitle?: string } }).cta ?? {}
  const title = cta.title ?? '¿Listo para empezar?'
  const subtitle = cta.subtitle ?? `Escribinos hoy y coordinamos lo que necesites. Te esperamos en ${business.address}.`

  return (
    <section id="cta" className="section-pad" style={{ backgroundColor: 'var(--demo-accent)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight" style={{ color: 'var(--demo-on-accent)' }}>
          {title}
        </h2>
        <p className="text-lg mb-10 opacity-80" style={{ color: 'var(--demo-on-accent)' }}>
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={`https://wa.me/${business.whatsapp}?text=Hola! Quiero reservar un turno.`}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-lg transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--demo-structural)',
              color: 'var(--demo-on-structural)',
              borderRadius: 'var(--demo-radius)',
            }}
          >
            <MessageCircle size={22} />
            Reservar por WhatsApp
          </a>
          <a
            href="#contact"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-lg border-2 transition-all hover:opacity-80"
            style={{
              borderColor: 'var(--demo-on-accent)',
              color: 'var(--demo-on-accent)',
              borderRadius: 'var(--demo-radius)',
            }}
          >
            Envianos un mensaje
            <ArrowRight size={20} />
          </a>
        </div>
      </div>
    </section>
  )
}
