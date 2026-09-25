/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Agregar remotePatterns con el hostname EXACTO del proyecto Supabase
    // ([ref].supabase.co) una vez creado — nunca un wildcard *.supabase.co,
    // abre el image optimizer de Next como proxy de cualquier proyecto Supabase.
  },
}

export default nextConfig
