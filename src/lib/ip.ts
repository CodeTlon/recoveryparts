import 'server-only'
import { headers } from 'next/headers'
import { ipDeCabeceras } from '@/lib/ip-cabeceras'

export { ipDeCabeceras }
export async function ipCliente() {
  return ipDeCabeceras(await headers())
}
