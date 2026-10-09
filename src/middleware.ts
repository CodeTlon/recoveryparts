import { NextResponse, type NextRequest } from 'next/server'
import { withSecurityHeaders } from '@/lib/security-headers'
import { COOKIE, leerToken } from '@/lib/session'
import { perfilDeSesion } from '@/lib/users'
import { dbConfigured } from '@/lib/env'

const ROLE_HOME = { admin: '/campus/admin', profesor: '/campus/profesor', alumno: '/campus/alumno' } as const

export async function middleware(request: NextRequest) {
  return withSecurityHeaders(await autenticar(request))
}

async function autenticar(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname
  if (!path.startsWith('/campus')) return NextResponse.next()

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
  return NextResponse.next()
}

// runtime nodejs: el middleware consulta Postgres y firma con node:crypto.
export const config = { runtime: 'nodejs', matcher: ['/((?!_next/static|_next/image|images|favicon.ico).*)'] }
