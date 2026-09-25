import { MapPin, Phone, Mail, Instagram } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'

export default function Footer() {
  const { business } = demoConfig

  return (
    <footer style={{ backgroundColor: 'var(--demo-structural)', color: 'var(--demo-on-structural)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Columna 1: Nombre + tagline */}
          <div>
            <h3 className="text-2xl font-bold mb-3">{business.name}</h3>
            <p className="text-sm opacity-60 leading-relaxed">{business.tagline}</p>
          </div>

          {/* Columna 2: Contacto */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest opacity-50">
              Contacto
            </h4>
            <ul className="space-y-3 text-sm">
              {business.address && (
                <li className="flex items-start gap-2 opacity-80">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--demo-accent)' }} />
                  {business.address}
                </li>
              )}
              {business.phone && (
                <li className="flex items-center gap-2 opacity-80">
                  <Phone size={16} style={{ color: 'var(--demo-accent)' }} />
                  {business.phone}
                </li>
              )}
              {business.email && (
                <li className="flex items-center gap-2 opacity-80">
                  <Mail size={16} style={{ color: 'var(--demo-accent)' }} />
                  {business.email}
                </li>
              )}
            </ul>
          </div>

          {/* Columna 3: Redes sociales */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest opacity-50">
              Seguinos
            </h4>
            {business.instagram && (
              <a
                href={`https://instagram.com/${business.instagram.replace('@', '')}`}
                className="inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity"
              >
                <Instagram size={18} style={{ color: 'var(--demo-accent)' }} />
                {business.instagram}
              </a>
            )}
          </div>
        </div>

        <div
          className="mt-12 pt-8 border-t text-center text-xs opacity-40"
          style={{ borderColor: 'var(--demo-border)' }}
        >
          © {new Date().getFullYear()} {business.name}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
