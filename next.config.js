/** @type {import('next').NextConfig} */
// Los encabezados de seguridad están en src/lib/security-headers.ts (los aplica el middleware).

const nextConfig = {
  // Imagen mínima para Docker/Coolify: server.js autocontenido en .next/standalone.
  output: 'standalone',
  // Las imágenes del CMS tienen nombre UUID (inmutables): el optimizador las puede guardar un mes sin revalidar.
  images: { formats: ['image/avif', 'image/webp'], minimumCacheTTL: 60 * 60 * 24 * 30 },
  // PDFs de hasta 25 MB vía server actions (fotos y videos suben por /api/media). Los dos topes llevan margen sobre los
  // 25 MB (multipart y los otros campos) para que el pedido llegue entero a la acción y sea ella la que conteste
  // «El PDF supera los 25 MB.»: el proxy (proxy.ts) corta el cuerpo en 10 MB por defecto y la acción fallaba con un 500
  // («Unexpected end of form») para cualquier PDF de más de 10 MB.
  experimental: { serverActions: { bodySizeLimit: '30mb' }, proxyClientMaxBodySize: '30mb' },
  // La galería pública se sacó (v0.17.2): un link viejo o un buscador que la tenga va al inicio. Temporal (307) por si
  // vuelve; las fotos siguen en cms_galeria.
  // Solo `next dev`: para probar desde otra máquina (p. ej. por Tailscale), DEV_ORIGINS=100.x.x.x habilita esa IP.
  ...(process.env.DEV_ORIGINS ? { allowedDevOrigins: process.env.DEV_ORIGINS.split(',') } : {}),
  async redirects() {
    return [{ source: '/galeria', destination: '/', permanent: false }]
  },
}

module.exports = nextConfig
