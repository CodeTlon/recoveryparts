/** @type {import('next').NextConfig} */
// Los encabezados de seguridad están en src/lib/security-headers.ts (los aplica el middleware).

const nextConfig = {
  // Imagen mínima para Docker/Coolify: server.js autocontenido en .next/standalone.
  output: 'standalone',
  // Las imágenes del CMS tienen nombre UUID (inmutables): el optimizador las puede guardar un mes sin revalidar.
  images: { formats: ['image/avif', 'image/webp'], minimumCacheTTL: 60 * 60 * 24 * 30 },
  // Fotos y PDFs de hasta 25 MB vía server actions (los videos suben por /api/media).
  experimental: { serverActions: { bodySizeLimit: '26mb' } },
}

module.exports = nextConfig
