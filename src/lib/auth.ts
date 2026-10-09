import 'server-only'
import { redirect } from 'next/navigation'
import { clienteUsuario } from '@/lib/db'
import { sesionActual } from '@/lib/session'
import { perfilDeSesion, type PerfilSesion } from '@/lib/users'
import type { Rol } from '@/lib/types'

export type Perfil = PerfilSesion

// Autorización en el servidor: valida sesión, cuenta activa y rol. RLS vuelve a validar en cada query.
export async function requireRole(...roles: Rol[]) {
  const ses = await sesionActual()
  if (!ses) redirect('/login')
  const perfil = await perfilDeSesion(ses.sub, ses.iat)
  if (!perfil || perfil.estado_cuenta !== 'activa' || !roles.includes(perfil.rol)) redirect('/login?error=cuenta')
  return { sb: clienteUsuario(perfil.id), perfil }
}

// Una fecha sola (AAAA-MM-DD) se muestra tal cual; un timestamp se pasa a hora de Córdoba (el servidor está en UTC).
export const fechaAR = (d: string | null) =>
  !d ? '—'
  : d.length === 10 ? new Date(d + 'T12:00:00Z').toLocaleDateString('es-AR', { timeZone: 'UTC' })
  : new Date(d).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Cordoba' })

// Para route handlers: devuelve el usuario con cuenta activa o null (el handler responde 401).
export async function usuarioApi() {
  const ses = await sesionActual()
  const perfil = ses ? await perfilDeSesion(ses.sub, ses.iat) : null
  if (!perfil || perfil.estado_cuenta !== 'activa') return null
  return { sb: clienteUsuario(perfil.id), perfil }
}
