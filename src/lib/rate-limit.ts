import { headers } from 'next/headers'

// Limitador en memoria por instancia — no comparte estado entre instancias
// serverless ni sobrevive a un cold start. Alcanza para frenar scripts básicos
// (brute-force de login, spam de recuperación de contraseña). Si el tráfico
// crece a multi-instancia en serio, pasar a Upstash/Redis con la misma firma.
const intentos = new Map<string, number[]>()

/** true si la request está dentro del límite, false si hay que rechazarla. */
export function rateLimit(key: string, limite: number, ventanaMs: number): boolean {
  const ahora = Date.now()
  const previos = (intentos.get(key) ?? []).filter((t) => ahora - t < ventanaMs)
  if (previos.length >= limite) {
    intentos.set(key, previos)
    return false
  }
  previos.push(ahora)
  intentos.set(key, previos)
  if (intentos.size > 5000) {
    for (const [k, v] of intentos) {
      if (v.every((t) => ahora - t >= ventanaMs)) intentos.delete(k)
    }
  }
  return true
}

export async function ipDeLaRequest(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'desconocida'
}
