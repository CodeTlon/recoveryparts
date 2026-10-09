import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

// Hash de contraseñas con scrypt (sin dependencias). Sin `server-only` para poder usarlo desde scripts (seed).
const scrypt = promisify(scryptCb) as (p: string, s: Buffer, n: number) => Promise<Buffer>

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const h = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${h.toString('base64')}`
}

export async function verificarHash(password: string, guardado: string | null): Promise<boolean> {
  const [alg, saltB64, hB64] = (guardado ?? '').split('$')
  // Sin usuario o sin contraseña igual se calcula un hash, para no filtrar por tiempo qué emails existen.
  const salt = alg === 'scrypt' ? Buffer.from(saltB64, 'base64') : Buffer.alloc(16)
  const esperado = alg === 'scrypt' ? Buffer.from(hB64, 'base64') : Buffer.alloc(64)
  const h = await scrypt(password, salt, 64)
  return alg === 'scrypt' && h.length === esperado.length && timingSafeEqual(h, esperado)
}
