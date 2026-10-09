import { NextResponse } from 'next/server'
import { sqlAdmin, dbConfigured } from '@/lib/db'

// Healthcheck para Coolify/Docker: responde 200 solo si la base contesta.
export const dynamic = 'force-dynamic'
export async function GET() {
  if (!dbConfigured) return NextResponse.json({ ok: false }, { status: 503 })
  try {
    await sqlAdmin('select 1')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
