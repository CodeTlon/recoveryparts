import type { MetadataRoute } from 'next'
import { getCursos, hayAulasVisibles } from '@/lib/data'
import { siteUrl } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl().replace(/\/$/, '')
  const [cursos, conAulas] = await Promise.all([getCursos(), hayAulasVisibles()])
  return [
    { url: base }, { url: `${base}/cursos` }, ...(conAulas ? [{ url: `${base}/aulas` }] : []), { url: `${base}/galeria` },
    { url: `${base}/preguntas-frecuentes` }, { url: `${base}/contacto` },
    ...cursos.map((c) => ({ url: `${base}/cursos/${c.slug}` })),
  ]
}
