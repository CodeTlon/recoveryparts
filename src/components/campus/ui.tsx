'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Inbox } from 'lucide-react'
import type { R } from '@/app/campus/admin/actions'

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

// Formulario con server action: muestra error/ok y se resetea al guardar.
export function ActionForm({ action, children, submit = 'Guardar', className = '', reset = true }: {
  action: (s: R, fd: FormData) => Promise<R>; children: React.ReactNode; submit?: string; className?: string; reset?: boolean
}) {
  const [s, run, pending] = useActionState<R, FormData>(action, {})
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (s.ok && reset) ref.current?.reset() }, [s, reset])
  return (
    <form ref={ref} action={run} className={`space-y-4 ${className}`}>
      {children}
      {s.error && <p role="alert" className="text-sm text-red-400">{s.error}</p>}
      {s.ok && !s.error && <p role="status" className="text-sm text-green-400">Guardado.</p>}
      <button disabled={pending} className="btn-primary">{pending ? 'Guardando…' : submit}</button>
    </form>
  )
}

export function Field({ label, name, type = 'text', defaultValue, required, placeholder, hint, rows, children }: {
  label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean; placeholder?: string; hint?: string; rows?: number; children?: React.ReactNode
}) {
  const id = `f-${name}`
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children ?? (rows
        ? <textarea id={id} name={name} rows={rows} required={required} defaultValue={defaultValue ?? ''} placeholder={placeholder} className="input font-mono text-xs" />
        : <input id={id} name={name} type={type} required={required} defaultValue={defaultValue ?? ''} placeholder={placeholder} className="input" />)}
      {hint && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
    </div>
  )
}

export function Select({ name, label, defaultValue, options, empty }: { name: string; label: string; defaultValue?: string | null; options: [string, string][]; empty?: string }) {
  return (
    <Field label={label} name={name}>
      <select id={`f-${name}`} name={name} defaultValue={defaultValue ?? ''} className="input">
        {empty !== undefined && <option value="">{empty}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Field>
  )
}

// Botón de envío para forms simples (<form action={serverAction}>).
export function Confirm({ children, message, className = 'btn-ghost !px-3 !py-2', name, value }: { children: React.ReactNode; message?: string; className?: string; name?: string; value?: string }) {
  return <button name={name} value={value} className={className} onClick={(e) => { if (message && !confirm(message)) e.preventDefault() }}>{children}</button>
}
