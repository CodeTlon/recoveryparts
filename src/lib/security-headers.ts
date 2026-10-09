import type { NextResponse } from 'next/server'

// Encabezados de seguridad. Viven en el middleware (y no en `headers()` de next.config) porque Vercel
// valida los valores de los encabezados declarados en la config durante el build y el deploy fallaba
// con "Builder returned invalid routes". Puestos en runtime no pasan por esa validación.
const supabaseHost = (() => {
  try { return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : '*.supabase.co' } catch { return '*.supabase.co' }
})()
const isDev = process.env.NODE_ENV !== 'production'

// CSP sin nonce: Next inyecta scripts inline, así que script-src necesita 'unsafe-inline'.
// Lo que sí cierra: plugins, <base>, formularios hacia afuera y embebido en otros sitios.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:${isDev ? ' http://127.0.0.1:*' : ''}`,
  `media-src 'self' blob: https:${isDev ? ' http://127.0.0.1:*' : ''}`,
  "font-src 'self' data:",
  `connect-src 'self' https://${supabaseHost}${isDev ? ' http://127.0.0.1:* ws://localhost:*' : ''}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

const HEADERS: Record<string, string> = {
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': csp,
}

export function withSecurityHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(HEADERS)) res.headers.set(k, v)
  return res
}
