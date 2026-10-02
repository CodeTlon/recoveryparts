// Rate limit en memoria (mejor esfuerzo; en serverless cada instancia tiene su contador).
// Complementa los límites propios de Supabase Auth.
const hits = new Map<string, { n: number; reset: number }>()

export function limited(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const h = hits.get(key)
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return false }
  h.n++
  return h.n > max
}
