import { NextResponse, type NextRequest } from 'next/server'
import { consumirToken, type TipoToken } from '@/lib/users'
import { firmarSesion, COOKIE, opcionesCookie } from '@/lib/session'
import { limited } from '@/lib/rate-limit'
import { ipDeCabeceras } from '@/lib/ip'
import { urlPublica } from '@/lib/env'

// Link de invitación / recuperación: valida el token (un solo uso, vence), abre la sesión y
// manda a /activar para definir la contraseña.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const type = request.nextUrl.searchParams.get('type')
  const falla = () => NextResponse.redirect(urlPublica('/activar?error=1'))
  if (!token || (type !== 'invite' && type !== 'recovery')) return falla()
  if (limited(`confirm:ip:${ipDeCabeceras(request.headers)}`, 20, 15 * 60_000)) return falla()

  const userId = await consumirToken(token, type as TipoToken)
  if (!userId) return falla()
  const res = NextResponse.redirect(urlPublica('/activar'))
  res.cookies.set(COOKIE, firmarSesion(userId).token, opcionesCookie)
  return res
}
