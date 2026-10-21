import type { NextResponse } from 'next/server'

// Encabezados de seguridad. Viven en el middleware (y no en `headers()` de next.config) porque en Vercel
// (donde estuvo antes) el deploy fallaba con "Builder returned invalid routes" al validar los encabezados de la config.
// Puestos en runtime no pasan por esa validación; se conservó así.
const isDev = process.env.NODE_ENV !== 'production'

// CSP con nonce por request: solo corren los scripts que Next marca con el nonce (y los que ellos carguen,
// 'strict-dynamic'); un script inyectado en la página no se ejecuta. Requiere que las páginas se rendericen en cada
// request (una página estática no puede llevar un nonce distinto por visita): ver `dynamic = 'force-dynamic'`.
// style-src conserva 'unsafe-inline' (estilos en línea de React y de las animaciones).
export function construirCsp(nonce: string) {
  return [
  "default-src 'self'",
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:${isDev ? ' http://127.0.0.1:*' : ''}`,
  `media-src 'self' blob: https:${isDev ? ' http://127.0.0.1:*' : ''}`,
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' http://127.0.0.1:* ws://localhost:*' : ''}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ].join('; ')
}

const HEADERS: Record<string, string> = {
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export function withSecurityHeaders(res: NextResponse, csp: string): NextResponse {
  for (const [k, v] of Object.entries(HEADERS)) res.headers.set(k, v)
  res.headers.set('Content-Security-Policy', csp)
  return res
}
