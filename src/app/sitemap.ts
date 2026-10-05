import type { MetadataRoute } from 'next'
import { getCursos } from '@/lib/data'

export const dynamic = 'force-dynamic'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cursos = await getCursos()
  return [
    { url: base }, { url: `${base}/cursos` }, { url: `${base}/galeria` },
    ...cursos.map((c) => ({ url: `${base}/cursos/${c.slug}` })),
  ]
}
