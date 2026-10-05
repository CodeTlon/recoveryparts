/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : '*.supabase.co'

const isDev = process.env.NODE_ENV !== 'production'
// CSP sin nonce: Next inyecta scripts inline, así que script-src necesita 'unsafe-inline'.
// Lo que sí cierra: plugins, <base>, formularios hacia afuera y embebido en otros sitios.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:${isDev ? ' http://127.0.0.1:*' : ''}`,
  "font-src 'self' data:",
  `connect-src 'self' https://${supabaseHost}${isDev ? ' http://127.0.0.1:* ws://localhost:*' : ''}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: supabaseHost }],
  },
  // PDFs de hasta 25 MB vía server actions.
  experimental: { serverActions: { bodySizeLimit: '26mb' } },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: csp },
      ],
    }]
  },
}

module.exports = nextConfig
