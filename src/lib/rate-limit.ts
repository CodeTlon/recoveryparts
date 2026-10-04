// Rate limit en memoria (mejor esfuerzo; en serverless cada instancia tiene su contador).
// Complementa los límites propios de Supabase Auth.
const hits = new Map<string, { n: number; reset: number }>()
const MAX_CLAVES = 5000

// Evita que el Map crezca sin tope con claves (emails/IPs) que no vuelven.
function limpiar(now: number) {
  if (hits.size < MAX_CLAVES) return
  for (const [k, h] of hits) if (h.reset < now) hits.delete(k)
  if (hits.size >= MAX_CLAVES) hits.clear()
}

/** Cuenta un intento y dice si ya superó el máximo. */
export function limited(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const h = hits.get(key)
  if (!h || h.reset < now) { limpiar(now); hits.set(key, { n: 1, reset: now + windowMs }); return false }
  h.n++
  return h.n > max
}

/** ¿Ya superó el máximo? No cuenta el intento (para contar solo los fallos con `registrar`). */
export function bloqueado(key: string, max: number) {
  const h = hits.get(key)
  return Boolean(h && h.reset >= Date.now() && h.n >= max)
}

/** Registra un intento fallido. */
export function registrar(key: string, windowMs: number) {
  limited(key, Infinity, windowMs)
}
