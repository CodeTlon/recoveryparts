'use server'

import { redirect } from 'next/navigation'
import { clienteAdmin, dbConfigured } from '@/lib/db'
import { iniciarSesion, iniciarActivacion, cerrarSesion, sesionActual, sesionActivacion } from '@/lib/session'
import { buscarIdPorEmail, consumirToken, enviarLinkAcceso, establecerPassword, perfilDeSesion, revocarSesiones, verificarCredenciales } from '@/lib/users'
import { limited, bloqueado, registrar } from '@/lib/rate-limit'
import { ipCliente } from '@/lib/ip'
import { validarPassword } from '@/lib/password'

export type AuthState = { error?: string; ok?: boolean }

const ip = ipCliente

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
  // El token es stateless: borrar la cookie no lo invalida. sesion_desde deja sin efecto toda cookie emitida antes
  // (también en otros dispositivos), así que una cookie robada no sobrevive al cierre de sesión.
  const ses = await sesionActual()
  if (ses) await revocarSesiones(ses.sub).catch(() => {})
  await cerrarSesion()
  redirect('/login')
}

// Consume el token del link (un solo uso) con un POST, no con el GET que puede abrir un escáner de mail, y abre una
// sesión de activación corta que solo permite definir la contraseña.
export async function confirmarAcceso(fd: FormData) {
  const token = String(fd.get('token') ?? ''), type = String(fd.get('type') ?? '')
  if (!dbConfigured || !token || (type !== 'invite' && type !== 'recovery')) redirect('/activar?error=1')
  if (limited(`confirm:ip:${await ip()}`, 20, 15 * 60_000)) redirect('/activar?error=1')
  const userId = await consumirToken(token, type)
  if (!userId) redirect('/activar?error=1')
  await iniciarActivacion(userId)
  redirect('/activar')
}

// Siempre responde lo mismo: no revela qué cuentas existen.
export async function olvideContrasena(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!dbConfigured) return { error: 'No disponible por el momento.' }
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  if (!limited(`reset:ip:${await ip()}`, 5, 15 * 60_000) && !limited(`reset:em:${email.slice(0, 254)}`, 5, 15 * 60_000) && email) {
    const id = await buscarIdPorEmail(email)
    // Sin await: el envío por SMTP tarda y, si solo se esperara para cuentas existentes, la demora delataría cuáles existen.
    if (id) void enviarLinkAcceso(email, id, 'recovery').catch(() => {})
  }
  return { ok: true }
}

// Define la contraseña (invitación o recuperación). Requiere la sesión de activación que abre confirmarAcceso:
// una sesión normal robada no alcanza para cambiar la contraseña (para eso está cambiarContrasena, que pide la actual).
export async function definirContrasena(_: AuthState, fd: FormData): Promise<AuthState> {
  const password = String(fd.get('password') ?? '')
  if (password !== String(fd.get('confirm') ?? '')) return { error: 'Las contraseñas no coinciden.' }
  const invalida = validarPassword(password)
  if (invalida) return { error: invalida }

  const ses = await sesionActivacion()
  const perfilActual = ses ? await perfilDeSesion(ses.sub, ses.iat) : null
  if (!ses || !perfilActual) return { error: 'El link venció. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".' }

  // Fija la contraseña, activa la cuenta pendiente (trigger al confirmar el email) y cierra las demás sesiones.
  try { await establecerPassword(ses.sub, password) } catch { return { error: 'No pudimos guardar la contraseña. Probá de nuevo.' } }
  await iniciarSesion(ses.sub)
  redirect(`/campus/${perfilActual.rol}`)
}

// Cambia la contraseña con la sesión iniciada (Mi cuenta). Pide la contraseña actual, la cuenta sale siempre de la
// sesión (nunca del formulario) y los fallos se limitan como en el login. Cierra las demás sesiones y renueva esta.
export async function cambiarContrasena(_: AuthState, fd: FormData): Promise<AuthState> {
  const actual = String(fd.get('actual') ?? ''), nueva = String(fd.get('password') ?? '')
  const ses = await sesionActual()
  const perfil = ses ? await perfilDeSesion(ses.sub, ses.iat) : null
  if (!ses || !perfil || perfil.estado_cuenta !== 'activa') return { error: 'Tu sesión venció. Volvé a ingresar.' }

  const kIp = `pass:ip:${await ip()}`, kUs = `pass:user:${perfil.id}`
  if (bloqueado(kIp, 20) || bloqueado(kUs, 8))
    return { error: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.' }
  if ((await verificarCredenciales(perfil.email.toLowerCase(), actual)) !== perfil.id) {
    registrar(kIp, 15 * 60_000); registrar(kUs, 15 * 60_000)
    return { error: 'La contraseña actual no es correcta.' }
  }
  if (nueva !== String(fd.get('confirm') ?? '')) return { error: 'Las contraseñas nuevas no coinciden.' }
  const invalida = validarPassword(nueva)
  if (invalida) return { error: invalida }
  if (nueva === actual) return { error: 'La contraseña nueva tiene que ser distinta de la actual.' }

  // sesion_desde = now() deja sin efecto las cookies anteriores; esta sesión se vuelve a emitir.
  try { await establecerPassword(perfil.id, nueva) } catch { return { error: 'No pudimos guardar la contraseña. Probá de nuevo.' } }
  await iniciarSesion(perfil.id)
  return { ok: true }
}
