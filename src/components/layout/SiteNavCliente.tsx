'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Menu, X } from 'lucide-react'

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/cursos', label: 'Cursos' },
  { href: '/aulas', label: 'Aulas' }, // RF-60: solo si hay aulas visibles (ver SiteNav)
  { href: '/preguntas-frecuentes', label: 'Preguntas' },
  { href: '/contacto', label: 'Contacto' },
]

// Menú flotante: al bajar se compacta en una cápsula con desenfoque; debajo, una pista que se carga con el scroll de la
// página (`.progreso-pagina`, animación nativa atada al scroll). En el celular abre un panel a pantalla completa.
export default function SiteNavCliente({ conAulas = false }: { conAulas?: boolean }) {
  const links = conAulas ? LINKS : LINKS.filter((l) => l.href !== '/aulas')
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuId = useId()
  const boton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const path = usePathname()
  const close = () => setOpen(false)
  const activo = (href: string) => (href === '/' ? path === '/' : path.startsWith(href))

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  // Panel móvil: bloquea el scroll de fondo, lleva el foco adentro, lo mantiene ahí con Tab y Esc lo cierra.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLElement>('a')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); boton.current?.focus(); return }
      if (e.key !== 'Tab' || !panel.current) return
      const f = [boton.current, ...panel.current.querySelectorAll<HTMLElement>('a')].filter(Boolean) as HTMLElement[]
      const i = f.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus() }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6">
      <nav aria-label="Principal" className={`relative mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 rounded-2xl border px-3 transition-[background-color,border-color,box-shadow] duration-500 ease-(--ease-out) md:px-5 ${scrolled || open ? 'border-outline-variant/70 bg-surface-container-lowest/75 shadow-card backdrop-blur-xl' : 'border-transparent bg-transparent'}`}>
        <Link href="/" onClick={close} className="group flex shrink-0 items-center gap-2.5 text-on-surface">
          <Image src="/images/logo.png" alt="" width={36} height={36} priority className="h-8 w-8 transition-transform duration-500 ease-(--ease-out) group-hover:rotate-[-8deg] group-hover:scale-110" />
          <span className="display text-lg leading-none md:text-xl">Recovery Parts</span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={activo(l.href) ? 'page' : undefined}
                className={`relative block rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${activo(l.href) ? 'text-on-surface' : 'text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface'}`}>
                {l.label}
                {activo(l.href) && <span aria-hidden className="absolute inset-x-3.5 -bottom-px h-0.5 rounded-full bg-accent" />}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-outline hidden py-2! lg:inline-flex">Campus <ArrowUpRight size={16} aria-hidden /></Link>
          <button ref={boton} type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls={menuId}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-on-surface hover:bg-on-surface/5 lg:hidden">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <span aria-hidden className="progreso-pagina pointer-events-none absolute inset-x-4 -bottom-px h-px scale-x-0 bg-linear-to-r from-accent via-accent to-signal-blue" />
      </nav>

      <div ref={panel} id={menuId} hidden={!open} className="fixed inset-x-0 bottom-0 top-[5.25rem] z-40 overflow-y-auto bg-surface-container-lowest/95 px-6 pb-10 pt-6 backdrop-blur-xl lg:hidden">
        <ul className="flex flex-col">
          {links.map((l, i) => (
            <li key={l.href} className="border-b border-outline-variant/60 motion-safe:animate-[menu-entra_0.5s_var(--ease-out)_both]" style={{ animationDelay: `${i * 45}ms` }}>
              <Link href={l.href} onClick={close} aria-current={activo(l.href) ? 'page' : undefined}
                className={`display flex items-center justify-between py-4 text-3xl ${activo(l.href) ? 'text-accent' : 'text-on-surface'}`}>
                {l.label} <ArrowUpRight size={22} aria-hidden className="text-on-surface-variant" />
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/login" onClick={close} className="btn-primary mt-8 w-full">Entrar al campus</Link>
      </div>
    </header>
  )
}
