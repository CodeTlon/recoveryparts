'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { clienteAdmin, dbConfigured } from '@/lib/db'
import { iniciarSesion, cerrarSesion, sesionActual } from '@/lib/session'
import { buscarIdPorEmail, enviarLinkAcceso, establecerPassword, perfilDeSesion, verificarCredenciales } from '@/lib/users'
import { limited, bloqueado, registrar } from '@/lib/rate-limit'
import { validarPassword } from '@/lib/password'

export type AuthState = { error?: string; ok?: boolean }

async function ip() {
  const h = await headers()
  // x-real-ip lo fija el proxy de la plataforma; x-forwarded-for puede traer valores del cliente.
  return h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'
}

export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!dbConfigured) return { error: 'El campus todavía no está configurado.' }
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  const password = String(fd.get('password') ?? '')
  // Bloqueo temporal tras intentos FALLIDOS (por IP y por email): los logins correctos no cuentan.
  const kIp = `login:ip:${await ip()}`, kEm = `login:em:${email.slice(0, 254)}`
  if (bloqueado(kIp, 20) || bloqueado(kEm, 8))
    return { error: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.' }

  const userId = await verificarCredenciales(email, password)
  if (!userId) {
    registrar(kIp, 15 * 60_000); registrar(kEm, 15 * 60_000)
    return { error: 'Email o contraseña incorrectos.' } // mensaje genérico
  }
  await iniciarSesion(userId)
  // Directo al panel de su rol (el middleware vuelve a validar rol y cuenta activa).
  const { data: perfil } = await clienteAdmin().from('profiles').select('rol').eq('id', userId).maybeSingle()
  redirect(perfil ? `/campus/${perfil.rol}` : '/login?error=cuenta')
}

export async function logout() {
  await cerrarSesion()
  redirect('/login')
}

// Siempre responde lo mismo: no revela qué cuentas existen.
export async function olvideContrasena(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!dbConfigured) return { error: 'No disponible por el momento.' }
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  if (!limited(`reset:ip:${await ip()}`, 5, 15 * 60_000) && !limited(`reset:em:${email}`, 5, 15 * 60_000) && email) {
    const id = await buscarIdPorEmail(email)
    if (id) await enviarLinkAcceso(email, id, 'recovery').catch(() => {})
  }
  return { ok: true }
}

// Define la contraseña (invitación o recuperación). Requiere la sesión creada por /auth/confirm.
export async function definirContrasena(_: AuthState, fd: FormData): Promise<AuthState> {
  const password = String(fd.get('password') ?? '')
  if (password !== String(fd.get('confirm') ?? '')) return { error: 'Las contraseñas no coinciden.' }
  const invalida = validarPassword(password)
  if (invalida) return { error: invalida }

  const ses = await sesionActual()
  const perfilActual = ses ? await perfilDeSesion(ses.sub, ses.iat) : null
  if (!ses || !perfilActual) return { error: 'El link venció. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".' }

  // Fija la contraseña, activa la cuenta pendiente (trigger al confirmar el email) y cierra las demás sesiones.
  await establecerPassword(ses.sub, password).catch(() => { throw new Error('No pudimos guardar la contraseña.') })
  await iniciarSesion(ses.sub)
  redirect(`/campus/${perfilActual.rol}`)
}
