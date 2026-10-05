import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/campus', '/api', '/login', '/activar', '/olvide-mi-contrasena'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
