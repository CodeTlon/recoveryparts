import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Rol } from '@/lib/types'

export type Perfil = { id: string; rol: Rol; nombre: string; apellido: string; email: string; estado_cuenta: string }

// Autorización en el servidor: valida sesión, cuenta activa y rol. RLS vuelve a validar en cada query.
export async function requireRole(...roles: Rol[]) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await sb.from('profiles').select('id, rol, nombre, apellido, email, estado_cuenta').eq('id', user.id).single()
  if (!perfil || perfil.estado_cuenta !== 'activa' || !roles.includes(perfil.rol)) redirect('/login?error=cuenta')
  return { sb, perfil: perfil as Perfil }
}

// Una fecha sola (AAAA-MM-DD) se muestra tal cual; un timestamp se pasa a hora de Córdoba (el servidor está en UTC).
export const fechaAR = (d: string | null) =>
  !d ? '—'
  : d.length === 10 ? new Date(d + 'T12:00:00Z').toLocaleDateString('es-AR', { timeZone: 'UTC' })
  : new Date(d).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Cordoba' })
