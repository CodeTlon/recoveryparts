'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Inbox, XCircle } from 'lucide-react'
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
  const [toast, setToast] = useState<'ok' | 'error' | null>(null)
  useEffect(() => { if (s.ok && reset) ref.current?.reset() }, [s, reset])
  useEffect(() => {
    if (!s.ok && !s.error) return
    setToast(s.error ? 'error' : 'ok')
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [s])
  return (
    <form ref={ref} action={run} className={`space-y-4 ${className}`}>
      {children}
      {s.error && <p role="alert" className="text-sm text-red-400">{s.error}</p>}
      <button disabled={pending} className="btn-primary">{pending ? 'Guardando…' : submit}</button>
      <AnimatePresence>
        {toast === 'ok' && (
          <motion.div role="status" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-pill border border-green-500/40 bg-surface-container-high px-5 py-3 text-sm font-semibold text-green-300 shadow-card-hover">
            <CheckCircle2 size={18} aria-hidden /> Guardado
          </motion.div>
        )}
        {toast === 'error' && (
          <motion.div aria-hidden initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-pill border border-red-500/40 bg-surface-container-high px-5 py-3 text-sm font-semibold text-red-300 shadow-card-hover">
            <XCircle size={18} aria-hidden /> No se pudo guardar
          </motion.div>
        )}
      </AnimatePresence>
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

// Botón de envío para acciones destructivas (<form action={serverAction}>).
// Con mouse/touch hay que MANTENERLO apretado ~1 s (el relleno naranja indica el avance);
// con teclado se mantiene el confirm() del navegador, así sigue siendo accesible.
export function Confirm({ children, message, className = 'btn-ghost !px-3 !py-2', name, value }: { children: React.ReactNode; message?: string; className?: string; name?: string; value?: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const [holding, setHolding] = useState(false)
  const [hint, setHint] = useState(false)
  const fired = useRef(false)
  const hold = !!message
  const cancel = () => { clearTimeout(timer.current); setHolding(false) }
  useEffect(() => () => clearTimeout(timer.current), [])

  if (!hold) return <button name={name} value={value} className={className}>{children}</button>
  return (
    <button ref={ref} name={name} value={value} title={message} className={`relative overflow-hidden ${className}`}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        setHolding(true)
        fired.current = false
        timer.current = setTimeout(() => { fired.current = true; setHolding(false); ref.current?.form?.requestSubmit(ref.current) }, 1000)
      }}
      onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
      onClick={(e) => {
        if (e.detail === 0) { if (!confirm(message)) e.preventDefault(); return } // teclado
        if (fired.current) { e.preventDefault(); return } // ya se envió al completar la pulsación
        if (e.isTrusted) { e.preventDefault(); setHint(true); setTimeout(() => setHint(false), 2200) } // click corto
      }}>
      <span aria-hidden className={`absolute inset-y-0 left-0 bg-red-500/40 ${holding ? 'w-full transition-[width] duration-1000 ease-linear' : 'w-0'}`} />
      <span className="relative inline-flex items-center gap-1">{hint ? 'Mantené apretado' : children}</span>
    </button>
  )
}
