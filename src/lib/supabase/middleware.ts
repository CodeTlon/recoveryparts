import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  alumno: '/alumno',
  profesor: '/profesor',
  administrador: '/admin',
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/recuperar')
  const isProtected =
    pathname.startsWith('/alumno') || pathname.startsWith('/profesor') || pathname.startsWith('/admin')

  // Páginas públicas y /activar (maneja su propia sesión vía hash, client-side) no
  // gatean nada acá — nos ahorramos el round-trip a Supabase Auth (getUser) sin
  // necesidad real de refrescar el token en ese request (mismo criterio que vimet).
  if (!isProtected && !isAuthRoute) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle()
    url.pathname = (profile?.rol && ROLE_HOME[profile.rol]) || '/alumno'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
