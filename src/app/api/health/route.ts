import { NextResponse } from 'next/server'
import { sqlAdmin, dbConfigured } from '@/lib/db'

// Healthcheck para Coolify/Docker: responde 200 solo si la base contesta.
export const dynamic = 'force-dynamic'
export async function GET() {
  if (!dbConfigured) return NextResponse.json({ ok: false }, { status: 503 })
  try {
    await sqlAdmin('select 1')
    // `started_at` (arranque del proceso) permite a CI saber que ya corre el contenedor del deploy que acaba de pedir.
    return NextResponse.json({ ok: true, status: 'ok', started_at: new Date(Date.now() - process.uptime() * 1000).toISOString() })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
