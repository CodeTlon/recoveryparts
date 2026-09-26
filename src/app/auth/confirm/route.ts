import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath, siteUrl } from '@/lib/site-url'

// Solo maneja el flujo PKCE (?code=), usado por resetPasswordForEmail. El flujo
// de invitación (admin.inviteUserByEmail) usa implicit flow (#access_token en el
// hash, invisible acá) y se procesa client-side en /activar — ver Bug 35 de
// bugs.md de la fábrica. No mezclar los dos flujos en esta ruta.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeNextPath(url.searchParams.get('next'), '/recuperar/nueva-clave')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, siteUrl()))
    }
  }

  return NextResponse.redirect(new URL('/recuperar?expirado=1', siteUrl()))
}
