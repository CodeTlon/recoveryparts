/** @type {import('next').NextConfig} */
// Los encabezados de seguridad están en src/lib/security-headers.ts (los aplica el middleware).

const nextConfig = {
  // Imagen mínima para Docker/Coolify: server.js autocontenido en .next/standalone.
  output: 'standalone',
  images: { formats: ['image/avif', 'image/webp'] },
  // Fotos y PDFs de hasta 25 MB vía server actions (los videos suben por /api/media).
  experimental: { serverActions: { bodySizeLimit: '26mb' } },
}

module.exports = nextConfig
