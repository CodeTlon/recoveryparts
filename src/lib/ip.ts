import 'server-only'
import { headers } from 'next/headers'

/** IP del cliente para los límites de intentos. `x-real-ip` lo fija el proxy; en `x-forwarded-for` el primer valor
 *  lo puede mandar el cliente, así que se toma el último (el que agregó el proxy). */
export function ipDeCabeceras(h: Pick<Headers, 'get'>) {
  const real = h.get('x-real-ip')?.trim()
  if (real) return real
  const xff = h.get('x-forwarded-for')?.split(',').map(s => s.trim()).filter(Boolean)
  return xff?.length ? xff[xff.length - 1] : 'local'
}

export async function ipCliente() {
  return ipDeCabeceras(await headers())
}
