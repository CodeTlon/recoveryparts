import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/alumno', '/profesor', '/login', '/activar', '/recuperar', '/auth', '/api'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
