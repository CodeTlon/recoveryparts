import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'

const inputStyle = {
  borderColor: 'var(--demo-border)',
  backgroundColor: 'var(--demo-surface)',
  color: 'var(--demo-text)',
  borderRadius: 'var(--demo-radius)',
} as const

export default function Contact() {
  const { business } = demoConfig

  return (
    <section id="contact" className="section-pad" style={{ backgroundColor: 'var(--demo-surface)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="eyebrow">Escribinos</p>
          <h2 className="section-title">Contacto</h2>
          <p className="section-subtitle mt-4">
            Reservá tu turno o consultanos lo que necesites.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Formulario visual */}
          <div className="card p-8" style={{ backgroundColor: 'var(--demo-surface-alt)' }}>
            <h3 className="font-bold text-xl mb-6" style={{ color: 'var(--demo-heading)' }}>
              Envianos un mensaje
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--demo-muted)' }}>Nombre</label>
                  <input type="text" placeholder="Tu nombre" readOnly
                    className="w-full px-4 py-3 border text-sm outline-none cursor-default" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--demo-muted)' }}>Teléfono</label>
                  <input type="tel" placeholder="+54 9 351 000-0000" readOnly
                    className="w-full px-4 py-3 border text-sm outline-none cursor-default" style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--demo-muted)' }}>Email</label>
                <input type="email" placeholder="tu@email.com" readOnly
                  className="w-full px-4 py-3 border text-sm outline-none cursor-default" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--demo-muted)' }}>Servicio de interés</label>
                <input type="text" placeholder="¿Qué servicio te interesa?" readOnly
                  className="w-full px-4 py-3 border text-sm outline-none cursor-default" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--demo-muted)' }}>Mensaje</label>
                <textarea placeholder="Contanos en qué podemos ayudarte..." readOnly rows={4}
                  className="w-full px-4 py-3 border text-sm outline-none cursor-default resize-none" style={inputStyle} />
              </div>
              <button
                className="w-full py-4 font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--demo-accent)', color: 'var(--demo-on-accent)', borderRadius: 'var(--demo-radius)' }}
                disabled
              >
                Enviar mensaje
              </button>
            </div>
          </div>

          {/* Info de contacto */}
          <div className="space-y-8">
            <div>
              <h3 className="font-bold text-xl mb-6" style={{ color: 'var(--demo-heading)' }}>
                Información de contacto
              </h3>
              <ul className="space-y-5">
                {[
                  { icon: MapPin,  text: business.address },
                  { icon: Phone,   text: business.phone },
                  { icon: Mail,    text: business.email },
                  { icon: Clock,   text: 'Lunes a Sábados: 9:00 a 19:00' },
                ].map(({ icon: Icon, text }) => text && (
                  <li key={text} className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--demo-accent)', borderRadius: 'var(--demo-radius)' }}
                    >
                      <Icon size={18} style={{ color: 'var(--demo-on-accent)' }} />
                    </div>
                    <span className="text-sm mt-2" style={{ color: 'var(--demo-text)' }}>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mapa placeholder */}
            <div
              className="overflow-hidden flex items-center justify-center h-48 border"
              style={{ backgroundColor: 'var(--demo-surface-alt)', borderColor: 'var(--demo-border)', borderRadius: 'var(--demo-radius-lg)' }}
            >
              <div className="text-center">
                <MapPin size={40} style={{ color: 'var(--demo-accent)' }} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: 'var(--demo-muted)' }}>{business.address}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
