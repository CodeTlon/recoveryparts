import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// Sesión propia: cookie httpOnly con un token firmado (HMAC-SHA256) { sub, iat, exp }.
// La cuenta activa, el rol y `auth.users.sesion_desde` se validan contra la base en cada request.
export const COOKIE = 'rp_session'
const DURACION = 7 * 24 * 3600

export type Sesion = { sub: string; iat: number; exp: number }

function secreto(): string {
  const s = process.env.SESSION_SECRET
  if (s && s.length >= 32) return s
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL)
    throw new Error('Falta SESSION_SECRET (mínimo 32 caracteres)')
  return 'dev-only-secret-no-usar-en-produccion-0123456789'
}

const firma = (datos: string) => createHmac('sha256', secreto()).update(datos).digest('base64url')

export function firmarSesion(sub: string): { token: string; sesion: Sesion } {
  const iat = Math.floor(Date.now() / 1000)
  const sesion = { sub, iat, exp: iat + DURACION }
  const cuerpo = Buffer.from(JSON.stringify(sesion)).toString('base64url')
  return { token: `${cuerpo}.${firma(cuerpo)}`, sesion }
}

export function leerToken(token: string | undefined): Sesion | null {
  if (!token) return null
  const [cuerpo, f] = token.split('.')
  if (!cuerpo || !f) return null
  const esperada = Buffer.from(firma(cuerpo)), recibida = Buffer.from(f)
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null
  try {
    const s = JSON.parse(Buffer.from(cuerpo, 'base64url').toString()) as Sesion
    return typeof s.sub === 'string' && s.exp > Date.now() / 1000 ? s : null
  } catch { return null }
}

export const opcionesCookie = {
  httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: DURACION,
  secure: process.env.NODE_ENV === 'production',
}

export async function sesionActual(): Promise<Sesion | null> {
  return leerToken((await cookies()).get(COOKIE)?.value)
}

export async function iniciarSesion(userId: string) {
  const { token } = firmarSesion(userId)
  ;(await cookies()).set(COOKIE, token, opcionesCookie)
}

export async function cerrarSesion() {
  ;(await cookies()).set(COOKIE, '', { ...opcionesCookie, maxAge: 0 })
}
