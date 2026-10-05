/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : '*.supabase.co'
// Los encabezados de seguridad están en src/lib/security-headers.ts (los aplica el middleware).

const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: supabaseHost }],
  },
  // PDFs de hasta 25 MB vía server actions.
  experimental: { serverActions: { bodySizeLimit: '26mb' } },
}

module.exports = nextConfig
