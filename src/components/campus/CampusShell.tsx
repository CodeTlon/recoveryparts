'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react'
import { logoutAction } from '@/lib/actions/auth'

export type CampusLink = { label: string; href: string; icon: LucideIcon }

function NavLinks({ links, onNavigate }: { links: CampusLink[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="flex-1 flex flex-col gap-2">
      {links.map(({ label, href, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
              active ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            <Icon size={20} /> {label}
          </Link>
        )
      })}
    </div>
  )
}

function SidebarInner({ titulo, nombre, links, onNavigate }: { titulo: string; nombre: string; links: CampusLink[]; onNavigate?: () => void }) {
  const iniciales = nombre.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <>
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary font-bold shrink-0">
          {iniciales}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-primary leading-tight truncate">{titulo}</h2>
          <p className="text-xs text-on-surface-variant truncate">{nombre}</p>
        </div>
      </div>

      <NavLinks links={links} onNavigate={onNavigate} />

      <form action={logoutAction} className="border-t border-outline-variant pt-3">
        <button type="submit" className="w-full flex items-center gap-4 rounded-lg px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">
          <LogOut size={20} /> Cerrar sesión
        </button>
      </form>
    </>
  )
}

export function CampusShell({
  titulo,
  nombre,
  links,
  children,
}: {
  titulo: string
  nombre: string
  links: CampusLink[]
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container border-r border-outline-variant p-4 z-50">
        <SidebarInner titulo={titulo} nombre={nombre} links={links} />
      </nav>

      <div className="md:hidden">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-surface-container border-b border-outline-variant px-4 h-16">
          <p className="text-sm font-semibold text-primary truncate">{titulo}</p>
          <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" className="inline-flex items-center justify-center w-11 h-11 -mr-1.5 rounded text-on-surface hover:text-secondary transition-colors shrink-0">
            <Menu size={24} />
          </button>
        </header>

        {open && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <nav className="absolute left-0 top-0 h-full w-72 max-w-[85vw] flex flex-col bg-surface-container border-r border-outline-variant p-4 overflow-y-auto">
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú" className="self-end inline-flex items-center justify-center w-11 h-11 -mr-1.5 -mt-1 rounded text-on-surface hover:text-secondary transition-colors">
                <X size={24} />
              </button>
              <SidebarInner titulo={titulo} nombre={nombre} links={links} onNavigate={() => setOpen(false)} />
            </nav>
          </div>
        )}
      </div>

      <main className="md:ml-64 min-h-screen p-4 md:p-12">
        <div className="max-w-[1280px] mx-auto">{children}</div>
      </main>
    </div>
  )
}
