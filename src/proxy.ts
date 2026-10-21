import { NextResponse, type NextRequest } from 'next/server'
import { construirCsp, withSecurityHeaders } from '@/lib/security-headers'
import { COOKIE, leerToken } from '@/lib/session'
import { perfilDeSesion } from '@/lib/users'
import { dbConfigured } from '@/lib/env'

const ROLE_HOME = { admin: '/campus/admin', profesor: '/campus/profesor', alumno: '/campus/alumno' } as const

export async function proxy(request: NextRequest) {
  // Nonce por request. Next lo toma de la CSP del REQUEST para marcar sus propios scripts, y la misma CSP sale en la respuesta.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = construirCsp(nonce)
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', csp)
  return withSecurityHeaders(await autenticar(request, () => NextResponse.next({ request: { headers } })), csp)
}

async function autenticar(request: NextRequest, continuar: () => NextResponse): Promise<NextResponse> {
  const path = request.nextUrl.pathname
  if (!path.startsWith('/campus')) return continuar()

  // Sin base configurada el campus no se puede usar: se muestra aviso en /login.
  if (!dbConfigured) return NextResponse.redirect(new URL('/login', request.url))

  const ses = leerToken(request.cookies.get(COOKIE)?.value)
  if (!ses) return NextResponse.redirect(new URL('/login', request.url))

  const perfil = await perfilDeSesion(ses.sub, ses.iat)
  if (!perfil || perfil.estado_cuenta !== 'activa') {
    const res = NextResponse.redirect(new URL('/login?error=cuenta', request.url))
    res.cookies.delete(COOKIE)
    return res
  }
  const home = ROLE_HOME[perfil.rol as keyof typeof ROLE_HOME]
  // Cada rol solo entra a su sección (la autorización real vuelve a validarse en requireRole y RLS).
  if (path === '/campus' || !path.startsWith(home)) return NextResponse.redirect(new URL(home, request.url))
  return continuar()
}

// runtime nodejs: el middleware consulta Postgres y firma con node:crypto.
// Quedan fuera:
//  - /media: archivos públicos inmutables, con su propia caché y Range.
//  - /api/media: valida sesión y rol por su cuenta, y con el middleware delante Next truncaba o rompía
//    ("Response body object should not be disturbed or locked") las subidas de más de 10MB.
export const config = {
  matcher: ['/((?!_next/static|_next/image|images|media|favicon.ico|api/media).*)']
}
