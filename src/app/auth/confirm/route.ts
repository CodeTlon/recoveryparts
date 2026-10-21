import { NextResponse, type NextRequest } from 'next/server'
import { urlPublica } from '@/lib/env'

// Link de invitación / recuperación. El GET NO consume el token: los escáneres de links de los clientes de mail
// abren la URL antes que la persona y lo quemarían. Manda a /activar/confirmar, donde un botón (POST) lo consume.
export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const type = request.nextUrl.searchParams.get('type')
  if (!token || (type !== 'invite' && type !== 'recovery')) return NextResponse.redirect(urlPublica('/activar?error=1'))
  const destino = new URL(urlPublica('/activar/confirmar'))
  destino.searchParams.set('token', token)
  destino.searchParams.set('type', type)
  return NextResponse.redirect(destino)
}
