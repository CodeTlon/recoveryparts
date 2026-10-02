'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Users, BarChart3, Globe, Inbox, ClipboardList, LogOut, Menu, X } from 'lucide-react'
import { logout } from '@/app/auth/actions'

type Item = { href: string; label: string; icon: keyof typeof ICONS }
const ICONS = { home: LayoutDashboard, cursos: BookOpen, usuarios: Users, reportes: BarChart3, sitio: Globe, consultas: Inbox, encuestas: ClipboardList }

export const NAV: Record<string, Item[]> = {
  alumno: [{ href: '/campus/alumno', label: 'Mis cursos', icon: 'cursos' }],
  profesor: [{ href: '/campus/profesor', label: 'Mis cursos', icon: 'cursos' }],
  admin: [
    { href: '/campus/admin', label: 'Resumen', icon: 'home' },
    { href: '/campus/admin/usuarios', label: 'Usuarios', icon: 'usuarios' },
    { href: '/campus/admin/cursos', label: 'Cursos y talleres', icon: 'cursos' },
    { href: '/campus/admin/encuestas', label: 'Encuestas', icon: 'encuestas' },
    { href: '/campus/admin/reportes', label: 'Reportes', icon: 'reportes' },
    { href: '/campus/admin/sitio', label: 'Sitio web', icon: 'sitio' },
    { href: '/campus/admin/consultas', label: 'Consultas', icon: 'consultas' },
  ],
}
const ROL_LABEL: Record<string, string> = { admin: 'Administración', profesor: 'Profesor', alumno: 'Alumno' }

function Inner({ rol, nombre, onNavigate }: { rol: string; nombre: string; onNavigate?: () => void }) {
  const path = usePathname()
  const items = NAV[rol]
  const iniciales = nombre.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()
  return (
    <>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high font-bold text-primary">{iniciales}</div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-primary">{nombre}</p>
          <p className="text-xs text-on-surface-variant">{ROL_LABEL[rol]}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Campus">
        {items.map(({ href, label, icon }) => {
          const Icon = ICONS[icon]
          const on = href === items[0].href ? path === href : path.startsWith(href)
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={on ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${on ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}>
              <Icon size={20} /> {label}
            </Link>
          )
        })}
      </nav>
      <form action={logout} className="border-t border-outline-variant pt-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-highest"><LogOut size={20} /> Cerrar sesión</button>
      </form>
    </>
  )
}

export default function CampusShell({ rol, nombre, children }: { rol: string; nombre: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', k)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', k) }
  }, [open])

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-tighter"><Image src="/images/logo.png" alt="" width={28} height={28} /> Recovery Parts</Link>
        <Inner rol={rol} nombre={nombre} />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-container px-4 md:hidden">
        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter"><Image src="/images/logo.png" alt="" width={28} height={28} /> Recovery Parts</span>
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" className="-mr-1.5 flex h-11 w-11 items-center justify-center rounded hover:text-secondary"><Menu size={24} /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-outline-variant bg-surface-container p-4">
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú" className="-mr-1.5 mb-2 flex h-11 w-11 items-center justify-center self-end rounded hover:text-secondary"><X size={24} /></button>
            <Inner rol={rol} nombre={nombre} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-h-screen p-4 md:ml-64 md:p-10"><div className="mx-auto max-w-[1180px]">{children}</div></main>
    </div>
  )
}
