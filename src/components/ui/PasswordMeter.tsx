'use client'

import { Check, X } from 'lucide-react'

// Medidor de fuerza (inspirado en componentes/password-strength.tsx de la biblioteca, simplificado).
// Es orientativo: la regla real (mín. 8 y no estar en la lista de comunes) la valida el servidor.
const REGLAS = [
  { id: 'len', label: 'Al menos 8 caracteres', ok: (p: string) => p.length >= 8 },
  { id: 'mix', label: 'Letras y números', ok: (p: string) => /[a-zA-ZñÑ]/.test(p) && /\d/.test(p) },
  { id: 'case', label: 'Mayúsculas y minúsculas', ok: (p: string) => /[a-zñ]/.test(p) && /[A-ZÑ]/.test(p) },
  { id: 'sym', label: 'Un símbolo o 12+ caracteres', ok: (p: string) => /[^a-zA-Z0-9ñÑ]/.test(p) || p.length >= 12 },
]
const NIVELES = [
  { label: 'Muy débil', bar: 'bg-red-500' },
  { label: 'Débil', bar: 'bg-red-400' },
  { label: 'Aceptable', bar: 'bg-accent' },
  { label: 'Buena', bar: 'bg-green-500' },
  { label: 'Excelente', bar: 'bg-green-400' },
]

export default function PasswordMeter({ value }: { value: string }) {
  const res = REGLAS.map((r) => ({ ...r, met: r.ok(value) }))
  const score = value ? res.filter((r) => r.met).length : 0
  const nivel = NIVELES[score]
  return (
    <div aria-live="polite" className="space-y-2">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < score ? nivel.bar : 'bg-surface-container-highest'}`} />
        ))}
      </div>
      <p className="text-xs text-on-surface-variant">{value ? <>Fuerza: <span className="font-semibold text-on-surface">{nivel.label}</span></> : 'Elegí una contraseña segura.'}</p>
      <ul className="grid gap-1 text-xs sm:grid-cols-2">
        {res.map((r) => (
          <li key={r.id} className={`flex items-center gap-1.5 ${r.met ? 'text-green-400' : 'text-on-surface-variant'}`}>
            {r.met ? <Check size={13} aria-hidden /> : <X size={13} aria-hidden className="opacity-50" />}{r.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
