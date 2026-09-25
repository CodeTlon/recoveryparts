'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'

const navLinks = [
  { label: 'Inicio',      href: '#hero' },
  { label: 'Nosotros',    href: '#about',    show: 'about' },
  { label: 'Servicios',   href: '#services', show: 'services' },
  { label: 'Galería',     href: '#gallery',  show: 'gallery' },
  { label: 'Precios',     href: '#pricing',  show: 'pricing' },
  { label: 'Equipo',      href: '#team',     show: 'team' },
  { label: 'Turnos',      href: '#schedule', show: 'schedule' },
  { label: 'Contacto',    href: '#contact',  show: 'contact' },
  { label: 'Acceder',     href: '/login' },
] as const

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { sections, business } = demoConfig

  const visibleLinks = navLinks.filter(
    (l) => !('show' in l) || sections[l.show as keyof typeof sections]
  )

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{ backgroundColor: 'var(--demo-structural)', borderColor: 'var(--demo-border)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Nombre */}
          <a href="#hero" className="text-xl font-bold tracking-tight" style={{ color: 'var(--demo-on-structural)' }}>
            {business.name}
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {visibleLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--demo-on-structural)' }}
              >
                {link.label}
              </a>
            ))}
            <a
              href={`https://wa.me/${business.whatsapp}`}
              className="px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--demo-accent)',
                color: 'var(--demo-on-accent)',
                borderRadius: 'var(--demo-radius)',
              }}
            >
              Reservar turno
            </a>
          </nav>

          {/* Mobile burger */}
          <button
            className="md:hidden p-2"
            onClick={() => setOpen(!open)}
            style={{ color: 'var(--demo-on-structural)' }}
            aria-label="Menú"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden border-t px-4 py-4 flex flex-col gap-3"
          style={{ backgroundColor: 'var(--demo-structural)', borderColor: 'var(--demo-border)' }}
        >
          {visibleLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium py-2 transition-opacity hover:opacity-70"
              style={{ color: 'var(--demo-on-structural)' }}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href={`https://wa.me/${business.whatsapp}`}
            className="mt-2 px-4 py-2 text-sm font-semibold text-center"
            style={{
              backgroundColor: 'var(--demo-accent)',
              color: 'var(--demo-on-accent)',
              borderRadius: 'var(--demo-radius)',
            }}
            onClick={() => setOpen(false)}
          >
            Reservar turno
          </a>
        </div>
      )}
    </header>
  )
}
