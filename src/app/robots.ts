import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/env'

// /login, /activar y /olvide-mi-contrasena NO se bloquean acá: llevan `noindex` y un robot bloqueado nunca lo vería
// (podría indexar la URL sin contenido). /campus también lleva `noindex`; se bloquea además para no gastar rastreo.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl().replace(/\/$/, '')
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/campus', '/api', '/auth'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
