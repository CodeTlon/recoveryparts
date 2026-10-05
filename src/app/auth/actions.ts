'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { siteUrl, supabaseConfigured } from '@/lib/supabase/env'
import { limited, bloqueado, registrar } from '@/lib/rate-limit'
import { validarPassword } from '@/lib/password'

export type AuthState = { error?: string; ok?: boolean }

async function ip() {
  const h = await headers()
  // x-real-ip lo fija el proxy de la plataforma; x-forwarded-for puede traer valores del cliente.
  return h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'
}

export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!supabaseConfigured) return { error: 'El campus todavía no está configurado.' }
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  const password = String(fd.get('password') ?? '')
  // Bloqueo temporal tras intentos FALLIDOS (por IP y por email): los logins correctos no cuentan.
  const kIp = `login:ip:${await ip()}`, kEm = `login:em:${email.slice(0, 254)}`
  if (bloqueado(kIp, 20) || bloqueado(kEm, 8))
    return { error: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.' }

  const sb = await createClient()
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) {
    registrar(kIp, 15 * 60_000); registrar(kEm, 15 * 60_000)
    return { error: 'Email o contraseña incorrectos.' } // mensaje genérico
  }
  // Directo al panel de su rol (el middleware vuelve a validar rol y cuenta activa).
  const { data: { user } } = await sb.auth.getUser()
  const { data: perfil } = user ? await sb.from('profiles').select('rol').eq('id', user.id).maybeSingle() : { data: null }
  redirect(perfil ? `/campus/${perfil.rol}` : '/login?error=cuenta')
}

export async function logout() {
  const sb = await createClient()
  await sb.auth.signOut()
  redirect('/login')
}

// Siempre responde lo mismo: no revela qué cuentas existen.
export async function olvideContrasena(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!supabaseConfigured) return { error: 'No disponible por el momento.' }
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  if (!limited(`reset:ip:${await ip()}`, 5, 15 * 60_000) && !limited(`reset:em:${email}`, 5, 15 * 60_000) && email) {
    const sb = await createClient()
    await sb.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/auth/confirm?next=/activar` })
  }
  return { ok: true }
}

// Define la contraseña (invitación o recuperación). Requiere la sesión creada por /auth/confirm.
export async function definirContrasena(_: AuthState, fd: FormData): Promise<AuthState> {
  const password = String(fd.get('password') ?? '')
  if (password !== String(fd.get('confirm') ?? '')) return { error: 'Las contraseñas no coinciden.' }
  const invalida = validarPassword(password)
  if (invalida) return { error: invalida }

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'El link venció. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".' }

  const { error } = await sb.auth.updateUser({ password })
  if (error) return { error: 'No pudimos guardar la contraseña. Probá con otra.' }
  await sb.from('profiles').update({ estado_cuenta: 'activa' }).eq('id', user.id).eq('estado_cuenta', 'pendiente_activacion')
  await sb.auth.signOut({ scope: 'others' }) // invalida las demás sesiones abiertas
  const { data: perfil } = await sb.from('profiles').select('rol').eq('id', user.id).maybeSingle()
  redirect(perfil ? `/campus/${perfil.rol}` : '/login')
}
