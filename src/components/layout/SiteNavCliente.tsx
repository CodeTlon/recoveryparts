'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/cursos', label: 'Cursos' },
  { href: '/aulas', label: 'Aulas' }, // RF-60: solo si hay aulas visibles (ver SiteNav)
  { href: '/galeria', label: 'Galería' },
  { href: '/preguntas-frecuentes', label: 'Preguntas' },
  { href: '/contacto', label: 'Contacto' },
]

export default function SiteNavCliente({ conAulas = false }: { conAulas?: boolean }) {
  const links = conAulas ? LINKS : LINKS.filter((l) => l.href !== '/aulas')
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuId = useId()
  const path = usePathname()
  const close = () => setOpen(false)
  const activo = (href: string) => !href.includes('#') && (href === '/' ? path === '/' : path.startsWith(href))

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const link = 'text-on-surface-variant hover:text-secondary transition-colors'

  return (
    <nav className={`fixed top-0 z-50 w-full border-b transition-[background-color,backdrop-filter,border-color] duration-300 ${scrolled || open ? 'border-outline-variant bg-surface/85 backdrop-blur-md' : 'border-transparent bg-surface'}`}>
      <div className="mx-auto flex h-20 w-full max-w-[1280px] items-center justify-between px-4 md:px-12">
        <Link href="/" onClick={close} className="flex items-center gap-2.5 text-lg font-bold uppercase tracking-tighter text-on-surface sm:text-xl md:text-2xl">
          <Image src="/images/logo.png" alt="" width={36} height={36} className="h-8 w-8 shrink-0 md:h-9 md:w-9" />
          Recovery Parts
        </Link>

        <div className="hidden items-center gap-8 text-sm font-semibold uppercase tracking-wide lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={activo(l.href) ? 'page' : undefined} className={`relative py-2 ${activo(l.href) ? 'text-on-surface' : link}`}>
              {l.label}
              {activo(l.href) && <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-accent" />}
            </Link>
          ))}
        </div>

        <Link href="/login" className="btn-primary hidden py-2! lg:inline-flex">Campus</Link>

        <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls={open ? menuId : undefined}
          className="-mr-1.5 inline-flex h-11 w-11 items-center justify-center rounded-sm text-on-surface hover:text-secondary lg:hidden">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div id={menuId} className="border-t border-outline-variant bg-surface px-4 pb-4 pt-2 lg:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={close} className={`block rounded-sm px-3 py-3 text-sm font-semibold uppercase tracking-wide hover:bg-surface-container-low ${link}`}>{l.label}</Link>
          ))}
          <Link href="/login" onClick={close} className="btn-primary mt-2 w-full">Campus</Link>
        </div>
      )}
    </nav>
  )
}
