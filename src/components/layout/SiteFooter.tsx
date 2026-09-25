import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'
import { WhatsAppIcon, InstagramIcon } from './SocialIcons'

// Footer compartido en TODAS las páginas públicas (home, catálogo, curso).
// Columnas: marca+redes · capacitaciones · contacto · acceso.
const CAPACITACIONES = [
  'Reparación de iPhone',
  'Reparación de Notebooks',
  'Reparación de PC',
  'Reparación de TV',
  'Cambio de Glass',
  'Carteles Neón LED',
]

export default function SiteFooter() {
  const { business } = demoConfig
  const ig = business.instagram.replace('@', '')

  return (
    <footer className="w-full bg-surface-container-lowest border-t border-outline-variant">
      <div className="grid grid-cols-2 md:grid-cols-12 gap-x-6 gap-y-8 md:gap-y-10 px-4 md:px-12 py-12 md:py-16 max-w-[1280px] mx-auto">

        {/* Marca + redes */}
        <div className="col-span-2 md:col-span-4 flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-on-surface uppercase tracking-tighter">
            <Image src="/images/logo.png" alt="Recovery Parts" width={36} height={36} className="w-9 h-9" />
            Recovery Parts
          </Link>
          <p className="text-on-surface-variant max-w-xs opacity-80">{business.tagline}. Formando técnicos con herramientas y estándares de taller real.</p>
          <div className="flex items-center gap-3 mt-1">
            <a href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-10 h-10 rounded border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-white hover:border-secondary transition-colors">
              <WhatsAppIcon size={20} />
            </a>
            <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 rounded border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-white hover:border-secondary transition-colors">
              <InstagramIcon size={20} />
            </a>
          </div>
        </div>

        {/* Capacitaciones */}
        <div className="col-span-2 md:col-span-3 flex flex-col gap-3">
          <span className="text-xs uppercase tracking-widest text-on-surface-variant/60 mb-1">Capacitaciones</span>
          <div className="columns-2 md:columns-1 gap-x-4">
            {CAPACITACIONES.map((c) => (
              <Link key={c} href="/cursos" className="block break-inside-avoid mb-2 md:mb-3 text-sm md:text-base text-on-surface-variant opacity-80 hover:text-primary hover:opacity-100 transition-colors">{c}</Link>
            ))}
          </div>
        </div>

        {/* Contacto */}
        <div className="col-span-2 md:col-span-3 flex flex-col gap-3">
          <span className="text-xs uppercase tracking-widest text-on-surface-variant/60 mb-1">Contacto</span>
          <a href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-on-surface-variant opacity-80 hover:text-primary hover:opacity-100 transition-colors">
            <Phone size={16} className="mt-0.5 shrink-0" /> {business.phone}
          </a>
          <a href={`mailto:${business.email}`} className="flex items-start gap-2 text-on-surface-variant opacity-80 hover:text-primary hover:opacity-100 transition-colors">
            <Mail size={16} className="mt-0.5 shrink-0" /> {business.email}
          </a>
          <span className="flex items-start gap-2 text-on-surface-variant opacity-80">
            <MapPin size={16} className="mt-0.5 shrink-0" /> {business.address}
          </span>
          <span className="flex items-start gap-2 text-on-surface-variant opacity-80">
            <Clock size={16} className="mt-0.5 shrink-0" /> Lun a Sáb · 9 a 19 hs
          </span>
        </div>

        {/* Acceso */}
        <div className="col-span-2 md:col-span-2 flex flex-col gap-3">
          <span className="text-xs uppercase tracking-widest text-on-surface-variant/60 mb-1">Plataforma</span>
          <div className="flex flex-row md:flex-col gap-x-6 gap-y-3">
            <Link href="/cursos" className="text-sm md:text-base text-on-surface-variant opacity-80 hover:text-primary hover:opacity-100 transition-colors">Ver catálogo</Link>
            <Link href="/login" className="text-sm md:text-base text-on-surface-variant opacity-80 hover:text-primary hover:opacity-100 transition-colors">Acceso alumnos</Link>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="col-span-2 md:col-span-12 mt-2 md:mt-4 pt-6 md:pt-8 border-t border-outline-variant/40 flex flex-col md:flex-row gap-3 justify-between items-center text-center md:text-left">
          <span className="text-sm text-on-surface-variant opacity-70">© 2026 Recovery Parts · Córdoba, Argentina. Todos los derechos reservados.</span>
          <a href="https://codetlon.com" target="_blank" rel="noopener noreferrer" className="text-xs uppercase tracking-widest text-on-surface-variant/50 hover:text-secondary transition-colors">
            Sitio por CodeTlon
          </a>
        </div>
      </div>
    </footer>
  )
}
