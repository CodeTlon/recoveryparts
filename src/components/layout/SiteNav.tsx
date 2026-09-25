'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

// Navbar compartido (home + catálogo). "Nosotros" y "Servicio Técnico" son
// links de muestra (no existen esas páginas) — href="#", solo presencia visual.
export default function SiteNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant">
      <div className="flex justify-between items-center px-4 md:px-12 h-20 w-full max-w-[1280px] mx-auto">
        <Link href="/" onClick={close} className="flex items-center gap-2.5 text-lg sm:text-xl md:text-2xl font-bold text-on-surface uppercase tracking-tighter">
          <Image src="/images/logo.png" alt="Recovery Parts" width={36} height={36} className="w-8 h-8 md:w-9 md:h-9 shrink-0" />
          Recovery Parts
        </Link>

        {/* Links desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold uppercase tracking-wide">
          <Link href="/cursos" className="text-on-surface-variant hover:text-secondary transition-colors">Cursos</Link>
          <a href="#" className="text-on-surface-variant hover:text-secondary transition-colors">Nosotros</a>
          <a href="#" className="text-on-surface-variant hover:text-secondary transition-colors">Servicio Técnico</a>
        </div>

        {/* CTA desktop */}
        <Link href="/login" className="hidden md:inline-flex text-sm font-bold text-primary border border-outline-variant px-6 py-2 rounded hover:text-secondary hover:border-secondary transition-all uppercase tracking-wider">
          Student Login
        </Link>

        {/* Hamburguesa mobile */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menú"
          aria-expanded={open}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-1.5 rounded text-on-surface hover:text-secondary transition-colors"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menú desplegable mobile — siempre montado, abre/cierra con slide + fade */}
      <div
        aria-hidden={!open}
        className={`md:hidden grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-outline-variant bg-surface px-4 pt-2 pb-4">
            <Link href="/cursos" onClick={close} className="block px-3 py-3 rounded text-sm font-semibold uppercase tracking-wide text-on-surface-variant hover:text-secondary hover:bg-surface-container-low transition-colors">Cursos</Link>
            <a href="#" onClick={close} className="block px-3 py-3 rounded text-sm font-semibold uppercase tracking-wide text-on-surface-variant hover:text-secondary hover:bg-surface-container-low transition-colors">Nosotros</a>
            <a href="#" onClick={close} className="block px-3 py-3 rounded text-sm font-semibold uppercase tracking-wide text-on-surface-variant hover:text-secondary hover:bg-surface-container-low transition-colors">Servicio Técnico</a>
            <Link href="/login" onClick={close} className="mt-2 flex items-center justify-center px-4 py-3 rounded text-sm font-bold uppercase tracking-wider text-primary border border-outline-variant hover:text-secondary hover:border-secondary transition-all">
              Student Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
