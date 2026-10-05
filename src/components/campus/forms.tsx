'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { R } from '@/app/campus/admin/actions'
import { useModalClose } from './Modal'

// Formulario con server action: muestra error/ok y se resetea al guardar.
// `S` permite que la acción devuelva datos extra (ej. el id del curso creado) que recibe `onSuccess`.
export function ActionForm<S extends R = R>({ action, children, submit = 'Guardar', className = '', reset = true, onSuccess }: {
  action: (s: S, fd: FormData) => Promise<S>; children: React.ReactNode; submit?: string; className?: string; reset?: boolean; onSuccess?: (s: S) => void
}) {
  const [s, run, pending] = useActionState<S, FormData>(action as unknown as (s: Awaited<S>, fd: FormData) => Promise<S>, {} as Awaited<S>)
  const closeModal = useModalClose()
  const okRef = useRef(onSuccess)
  okRef.current = onSuccess
  // Dentro de un modal: tras guardar se cierra (con una pausa para que se vea el aviso).
  useEffect(() => { if (s.ok && closeModal) { const t = setTimeout(closeModal, 900); return () => clearTimeout(t) } }, [s, closeModal])
  useEffect(() => { if (s.ok) okRef.current?.(s) }, [s])
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

// El id sale de useId(): varias pantallas repiten el mismo `name` en muchos formularios y, con un id
// derivado del name, cada etiqueta enfocaba el input del primer formulario.
export function Field({ label, name, type = 'text', defaultValue, required, placeholder, hint, rows, min, max, step, children }: {
  label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean; placeholder?: string; hint?: string; rows?: number; min?: number; max?: number; step?: number
  children?: React.ReactNode | ((p: { id: string; 'aria-describedby'?: string }) => React.ReactNode)
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div>
      <label htmlFor={id} className="label">{label}{required && <span aria-hidden className="text-accent"> *</span>}</label>
      {typeof children === 'function' ? children({ id, 'aria-describedby': hintId }) : children ?? (rows
        ? <textarea id={id} name={name} rows={rows} required={required} defaultValue={defaultValue ?? ''} placeholder={placeholder} aria-describedby={hintId} className="input font-mono text-xs" />
        : <input id={id} name={name} type={type} required={required} min={min} max={max} step={step} defaultValue={defaultValue ?? ''} placeholder={placeholder} aria-describedby={hintId} className="input" />)}
      {hint && <p id={hintId} className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
    </div>
  )
}

// Botón de envío para <form action={serverAction}> simples: se deshabilita mientras se envía.
export function SubmitButton({ children, className = 'btn-ghost !px-3 !py-2' }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus()
  return <button disabled={pending} aria-busy={pending} className={className}>{children}</button>
}

// Campo de archivo. Vive acá (cliente) porque Field recibe una función como hijo y una página de servidor no puede pasarla.
export function FileField({ label, name, accept, required, hint }: { label: string; name: string; accept: string; required?: boolean; hint?: string }) {
  return (
    <Field label={label} name={name} required={required} hint={hint}>
      {(p) => <input {...p} name={name} type="file" accept={accept} required={required} className="input" />}
    </Field>
  )
}

export function Select({ name, label, defaultValue, options, empty }: { name: string; label: string; defaultValue?: string | null; options: [string, string][]; empty?: string }) {
  return (
    <Field label={label} name={name}>
      {(p) => (
        <select {...p} name={name} defaultValue={defaultValue ?? ''} className="input">
          {empty !== undefined && <option value="">{empty}</option>}
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
    </Field>
  )
}

// Botón de envío para acciones destructivas (<form action={serverAction}>).
// Con mouse/touch hay que MANTENERLO apretado ~1 s (el relleno naranja indica el avance);
// con teclado se abre un modal de confirmación propio, así sigue siendo accesible.
export function Confirm({ children, message, className = 'btn-ghost !px-3 !py-2', name, value }: { children: React.ReactNode; message?: string; className?: string; name?: string; value?: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  const dlg = useRef<HTMLDialogElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const hintTimer = useRef<ReturnType<typeof setTimeout>>()
  const [holding, setHolding] = useState(false)
  const [hint, setHint] = useState(false)
  const fired = useRef(false)
  const hold = !!message
  const cancel = () => { clearTimeout(timer.current); setHolding(false) }
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(hintTimer.current) }, [])

  if (!hold) return <button name={name} value={value} className={className}>{children}</button>
  return (
    <>
    <button ref={ref} name={name} value={value} title={message} className={`relative select-none overflow-hidden [-webkit-touch-callout:none] ${className}`} onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        setHolding(true)
        fired.current = false
        timer.current = setTimeout(() => { fired.current = true; setHolding(false); ref.current?.form?.requestSubmit(ref.current) }, 1000)
      }}
      onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
      onClick={(e) => {
        if (e.detail === 0) { e.preventDefault(); dlg.current?.showModal(); return } // teclado: modal propio, sin confirm() del navegador
        if (fired.current) { e.preventDefault(); return } // ya se envió al completar la pulsación
        if (e.isTrusted) { e.preventDefault(); setHint(true); clearTimeout(hintTimer.current); hintTimer.current = setTimeout(() => setHint(false), 2200) } // click corto
      }}>
      <span aria-hidden className={`absolute inset-y-0 left-0 bg-red-500/40 ${holding ? 'w-full transition-[width] duration-1000 ease-linear' : 'w-0'}`} />
      <span className="relative inline-flex items-center gap-1">{hint ? 'Mantené apretado' : children}</span>
    </button>
    <dialog ref={dlg} aria-label="Confirmar acción" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close() }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-outline-variant bg-surface-container p-0 text-on-surface shadow-card-hover backdrop:bg-black/60 backdrop:backdrop-blur-sm">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-primary">¿Confirmás?</h2>
        <p className="mt-2 text-sm text-on-surface-variant">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" autoFocus className="btn-ghost !px-4 !py-2" onClick={() => dlg.current?.close()}>Cancelar</button>
          <button type="button" className="btn-primary !px-4 !py-2" onClick={() => { dlg.current?.close(); ref.current?.form?.requestSubmit(ref.current) }}>Confirmar</button>
        </div>
      </div>
    </dialog>
    </>
  )
}

export function Check({ name, defaultChecked, className = '', children }: { name: string; defaultChecked?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex items-center gap-2 text-sm ${className}`}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} /> {children}
    </label>
  )
}
