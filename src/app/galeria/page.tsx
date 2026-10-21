import type { Metadata } from 'next'
import { metaPagina } from '@/lib/seo'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import Galeria, { type Foto } from '@/components/public/Lightbox'
import { query } from '@/lib/data'

export const metadata: Metadata = metaPagina({ titulo: 'Galería', descripcion: 'Fotos de la academia: cursos, talleres y trabajos de los alumnos.', ruta: '/galeria' })
export const dynamic = 'force-dynamic'

export default async function GaleriaPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { categoria } = await searchParams // ?categoria=aulas: link desde la sección «Aulas»
  const fotos = await query<Foto[]>('galeria', (sb) => sb.from('cms_galeria').select('id, imagen_url, alt, descripcion, categoria, area').order('orden'), [])
  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="grow pt-20 outline-hidden">
        <section className="grid-bg border-b border-outline-variant">
          <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-12">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Galería</h1>
            <p className="max-w-2xl text-lg text-on-surface-variant">Nuestras aulas, las clases y los trabajos de quienes pasaron por la academia.</p>
          </div>
        </section>
        <section className="mx-auto max-w-[1280px] px-4 py-14 md:px-12"><Galeria fotos={fotos} inicial={categoria} /></section>
      </main>
      <SiteFooter />
    </div>
  )
}
