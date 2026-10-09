import { NextResponse, type NextRequest } from 'next/server'
import { consumirToken, type TipoToken } from '@/lib/users'
import { firmarSesion, COOKIE, opcionesCookie } from '@/lib/session'
import { limited } from '@/lib/rate-limit'

// Link de invitación / recuperación: valida el token (un solo uso, vence), abre la sesión y
// manda a /activar para definir la contraseña.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const type = request.nextUrl.searchParams.get('type')
  const falla = () => NextResponse.redirect(new URL('/activar?error=1', request.url))
  if (!token || (type !== 'invite' && type !== 'recovery')) return falla()
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'
  if (limited(`confirm:ip:${ip}`, 20, 15 * 60_000)) return falla()

  const userId = await consumirToken(token, type as TipoToken)
  if (!userId) return falla()
  const res = NextResponse.redirect(new URL('/activar', request.url))
  res.cookies.set(COOKIE, firmarSesion(userId).token, opcionesCookie)
  return res
}
