import Link from 'next/link'
import { ArrowLeft, Inbox } from 'lucide-react'

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-on-surface-variant">{sub}</p>}
      </div>
      {action}
    </header>
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
  const t = { ok: 'bg-green-600/20 text-green-300', bad: 'bg-red-600/20 text-red-300', warn: 'bg-accent/20 text-secondary', neutral: 'bg-surface-container-high text-on-surface-variant' }[tone]
  return <span className={`badge ${t}`}>{children}</span>
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-secondary">
      <ArrowLeft size={16} /> {children}
    </Link>
  )
}

// Estado de una inscripción → Badge (activo en verde, desertor en rojo, finalizado neutro).
export function EstadoBadge({ estado }: { estado: string }) {
  return <Badge tone={estado === 'activo' ? 'ok' : estado === 'desertor' ? 'bad' : 'neutral'}><span className="capitalize">{estado}</span></Badge>
}

// Lo interactivo vive en forms.tsx ('use client'); se re-exporta para no cambiar los imports.
export { ActionForm, Field, FileField, Select, Confirm, SubmitButton, Check } from './forms'
export { ModalButton } from './Modal'
