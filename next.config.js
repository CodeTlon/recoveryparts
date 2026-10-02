/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : '*.supabase.co'

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
      ],
    }]
  },
}

module.exports = nextConfig
