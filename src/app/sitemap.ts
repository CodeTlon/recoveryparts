import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/site-url'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const estaticas: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/cursos`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/galeria`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  try {
    const supabase = await createClient()
    const { data: cursos } = await supabase.from('cursos').select('slug, updated_at').eq('publicado', true)
    const dinamicas: MetadataRoute.Sitemap = (cursos ?? []).map((c) => ({
      url: `${base}/cursos/${c.slug}`,
      lastModified: c.updated_at,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
    return [...estaticas, ...dinamicas]
  } catch {
    return estaticas // build sin credenciales de Supabase (Bug 24)
  }
}
