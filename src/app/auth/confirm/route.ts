import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// El mail de Supabase apunta acá (ver docs/SETUP-SUPABASE.md):
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite
// Se valida el token (un solo uso) y se redirige: el token sale de la URL.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const dest = new URL('/activar', request.url)

  if (token_hash && type) {
    const sb = await createClient()
    const { error } = await sb.auth.verifyOtp({ type, token_hash })
    if (!error) return NextResponse.redirect(dest)
  }
  return NextResponse.redirect(new URL('/activar?error=1', request.url))
}
