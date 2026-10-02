/** @type {import('next').NextConfig} */
// Hostname EXACTO del proyecto Supabase (nunca un wildcard *.supabase.co: abre el image
// optimizer de Next como proxy de cualquier proyecto). En local es 127.0.0.1.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null

const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: supabaseUrl
      ? [{ protocol: supabaseUrl.protocol.replace(':', ''), hostname: supabaseUrl.hostname, ...(supabaseUrl.port ? { port: supabaseUrl.port } : {}) }]
      : [],
  },
  // PDFs de hasta 25 MB subidos por server action.
  experimental: { serverActions: { bodySizeLimit: '26mb' } },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    }]
  },
}

export default nextConfig
