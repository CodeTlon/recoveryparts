import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Inbox, type LucideIcon } from 'lucide-react'

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-3xl [font-stretch:108%] md:text-4xl">{title}</h1>
        {sub && <p className="mt-2 text-on-surface-variant">{sub}</p>}
      </div>
      {action}
    </header>
  )
}

// Cifra del resumen (admin/profesor): número grande en Archivo, ícono y flecha que se corre al pasar el mouse. El
// enlace lo pone quien la usa (con `group`). `alerta`: algo pide atención (borde naranja y punto).
export function StatTile({ Icon, valor, etiqueta, alerta = false }: { Icon: LucideIcon; valor: number; etiqueta: string; alerta?: boolean }) {
  return (
    <div className={`card relative h-full p-5 shadow-card transition-[border-color,box-shadow,translate] duration-300 ease-(--ease-out) group-hover:-translate-y-0.5 group-hover:border-outline group-hover:shadow-card-hover ${alerta ? 'border-accent/70' : ''}`}>
      <div className="flex items-center justify-between">
        <span aria-hidden className={`grid h-9 w-9 place-items-center rounded-lg ${alerta ? 'bg-accent/15 text-accent' : 'bg-surface-container-high text-on-surface-variant'}`}><Icon size={18} /></span>
        <ArrowUpRight size={16} aria-hidden className="text-on-surface-variant transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <p className="display mt-4 text-4xl">{valor}{alerta && <span aria-hidden className="ml-2 inline-block h-2 w-2 -translate-y-4 rounded-full bg-accent motion-safe:animate-pulse" />}</p>
      <p className="mt-1 text-sm text-on-surface-variant">{etiqueta}</p>
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center text-on-surface-variant">
      <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
        <Inbox size={22} />
      </span>
      <div>{children}</div>
    </div>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'ok' | 'bad' | 'warn' | 'neutral'; children: React.ReactNode }) {
  const t = { ok: 'bg-success/15 text-success', bad: 'bg-danger/15 text-danger', warn: 'bg-accent/15 text-secondary', neutral: 'bg-surface-container-high text-on-surface-variant' }[tone]
  return <span className={`badge ${t}`}>{children}</span>
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface">
      <ArrowLeft size={16} /> {children}
    </Link>
  )
}

// Pestañas de una página del campus (curso, edición, sitio web, curso del profesor). La pestaña va en la URL (`?tab=`):
// se comparte, funciona Atrás y cada una carga solo lo suyo. `n`: cantidad opcional al lado del nombre. En el celular
// la fila se desliza en vez de partirse en varias líneas.
export function Pestanas({ label, items, actual, href }: { label: string; items: [string, string, number?][]; actual: string; href: (k: string) => string }) {
  return (
    <nav aria-label={label} className="-mx-4 mb-8 overflow-x-auto border-b border-outline-variant px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1 pb-3">
        {items.map(([k, l, n]) => (
          <li key={k}>
            <Link href={href(k)} scroll={false} aria-current={actual === k ? 'page' : undefined}
              className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-colors ${actual === k ? 'bg-on-surface text-surface-container-lowest' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
              {l}{n != null && <span className={`rounded-full px-1.5 text-xs tabular-nums ${actual === k ? 'bg-surface-container-lowest/15' : 'bg-surface-container-high'}`}>{n}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Estado de una inscripción → Badge (activo en verde, desertor en rojo, finalizado neutro).
export function EstadoBadge({ estado }: { estado: string }) {
  return <Badge tone={estado === 'activo' ? 'ok' : estado === 'desertor' ? 'bad' : 'neutral'}><span className="capitalize">{estado}</span></Badge>
}

// Lo interactivo vive en forms.tsx ('use client'); se re-exporta para no cambiar los imports.
export { ActionForm, Field, FileField, Select, Confirm, SubmitButton, Check } from './forms'
export { ModalButton } from './Modal'
