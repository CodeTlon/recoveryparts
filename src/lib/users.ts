import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { hashPassword, verificarHash } from '@/lib/password-hash'
import { sqlAdmin } from '@/lib/db'
import { siteUrl } from '@/lib/env'
import { enviarMail } from '@/lib/mail'

// Cuentas, contraseñas y tokens de un solo uso (reemplazan a Supabase Auth).
// Todo corre con el rol de servicio: auth.users y auth.tokens no son visibles para anon/authenticated.
// No hay registro público: el perfil solo se crea para filas con invited_at (trigger de la migración 0006).
// Devuelve el id si el email y la contraseña son correctos.
export async function verificarCredenciales(email: string, password: string): Promise<string | null> {
  const [u] = await sqlAdmin<{ id: string; password_hash: string | null }>(
    'select id, password_hash from auth.users where email = $1', [email])
  const ok = await verificarHash(password, u?.password_hash ?? null)
  return ok && u ? u.id : null
}

export async function establecerPassword(userId: string, password: string) {
  // email_confirmed_at activa la cuenta pendiente (trigger handle_user_confirmed); sesion_desde cierra las demás sesiones.
  await sqlAdmin(
    `update auth.users set password_hash = $2, email_confirmed_at = coalesce(email_confirmed_at, now()), sesion_desde = now() where id = $1`,
    [userId, await hashPassword(password)])
}

export type PerfilSesion = { id: string; rol: 'admin' | 'profesor' | 'alumno'; nombre: string; apellido: string; email: string; estado_cuenta: string }

// Perfil de la sesión, o null si la cuenta no existe o la sesión se emitió antes de sesion_desde.
export async function perfilDeSesion(userId: string, iat: number): Promise<PerfilSesion | null> {
  const [p] = await sqlAdmin<PerfilSesion & { sesion_desde: string | null }>(
    `select p.id, p.rol, p.nombre, p.apellido, p.email, p.estado_cuenta, u.sesion_desde
     from public.profiles p join auth.users u on u.id = p.id where p.id = $1`, [userId])
  if (!p) return null
  if (p.sesion_desde && iat < Math.floor(new Date(p.sesion_desde).getTime() / 1000)) return null
  return p
}

// ── Tokens de invitación / recuperación ───────────────────
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex')
const VIGENCIA = { invite: 7 * 24 * 3600, recovery: 3600 } as const
export type TipoToken = keyof typeof VIGENCIA

export async function emitirToken(userId: string, tipo: TipoToken): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  // Un token nuevo invalida los anteriores.
  await sqlAdmin('update auth.tokens set usado_en = now() where user_id = $1 and usado_en is null', [userId])
  await sqlAdmin(
    `insert into auth.tokens (user_id, tipo, token_hash, expira_en) values ($1, $2, $3, now() + make_interval(secs => $4))`,
    [userId, tipo, hashToken(token), VIGENCIA[tipo]])
  return token
}

// Uso único: marca el token como usado y devuelve el usuario.
export async function consumirToken(token: string, tipo: TipoToken): Promise<string | null> {
  const [t] = await sqlAdmin<{ user_id: string }>(
    `update auth.tokens set usado_en = now()
     where token_hash = $1 and tipo = $2 and usado_en is null and expira_en > now() returning user_id`,
    [hashToken(token), tipo])
  return t?.user_id ?? null
}

export async function enviarLinkAcceso(email: string, userId: string, tipo: TipoToken): Promise<boolean> {
  const token = await emitirToken(userId, tipo)
  const link = `${siteUrl()}/auth/confirm?token=${token}&type=${tipo}`
  return tipo === 'invite'
    ? enviarMail(email, 'Activá tu cuenta de Recovery Parts',
        `Te invitamos al campus de Recovery Parts.\n\nCreá tu contraseña desde este link (se usa una sola vez y vence en 7 días):\n${link}\n`)
    : enviarMail(email, 'Recuperá tu contraseña',
        `Entrá a este link para crear una contraseña nueva (se usa una sola vez y vence en 1 hora):\n${link}\n\nSi no lo pediste vos, ignoralo: tu contraseña actual sigue funcionando.\n`)
}

// ── Cuentas ───────────────────────────────────────────────
export async function invitarUsuario(email: string, meta: { rol: string; nombre: string; apellido: string; telefono: string | null }): Promise<string | null> {
  const [u] = await sqlAdmin<{ id: string }>(
    `insert into auth.users (email, raw_user_meta_data, invited_at) values ($1, $2::jsonb, now()) returning id`,
    [email, meta]).catch(() => [])
  if (!u) return null
  if (!(await enviarLinkAcceso(email, u.id, 'invite'))) console.error('invitación: no se pudo enviar el mail')
  return u.id
}

export async function buscarIdPorEmail(email: string): Promise<string | null> {
  const [u] = await sqlAdmin<{ id: string }>('select id from auth.users where email = $1', [email])
  return u?.id ?? null
}
export async function cambiarEmailUsuario(id: string, email: string) {
  await sqlAdmin('update auth.users set email = $2 where id = $1', [id, email])
}
export async function eliminarUsuario(id: string) {
  await sqlAdmin('delete from auth.users where id = $1', [id])
}
