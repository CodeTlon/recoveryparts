import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { withSecurityHeaders } from '@/lib/security-headers'

const ROLE_HOME = { admin: '/campus/admin', profesor: '/campus/profesor', alumno: '/campus/alumno' } as const

export async function middleware(request: NextRequest) {
  return withSecurityHeaders(await autenticar(request))
}

async function autenticar(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const path = request.nextUrl.pathname

  // Sin Supabase configurado el campus no se puede usar: se muestra aviso en /login.
  if (!url || !key) {
    if (path.startsWith('/campus')) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (path.startsWith('/campus')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const { data: perfil } = await supabase.from('profiles').select('rol, estado_cuenta').eq('id', user.id).single()
    if (!perfil || perfil.estado_cuenta !== 'activa') {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?error=cuenta', request.url))
    }
    const home = ROLE_HOME[perfil.rol as keyof typeof ROLE_HOME]
    // Cada rol solo entra a su sección (la autorización real vuelve a validarse en RLS).
    if (path === '/campus' || !path.startsWith(home)) return NextResponse.redirect(new URL(home, request.url))
  }

  return response
}

export const config = { matcher: ['/((?!_next/static|_next/image|images|favicon.ico).*)'] }
