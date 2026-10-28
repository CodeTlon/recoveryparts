import type { Metadata } from 'next'
import { metaPagina } from '@/lib/seo'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import { redirect } from 'next/navigation'
import Galeria, { type Foto } from '@/components/public/Lightbox'
import { CATEGORIA_LABEL } from '@/lib/galeria'
import Paginas from '@/components/ui/Paginas'
import { hrefPagina, paginaDe, paginar } from '@/lib/paginar'
import { query } from '@/lib/data'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 18 // múltiplo de 6: el ritmo de la grilla (una foto ancha cada seis) cierra en cada página
type SP = { categoria?: string; pagina?: string }

// Categoría y página en la URL: cada combinación es una URL propia y canónica (se comparte, funciona Atrás, sin JS).
export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const { categoria, pagina } = await searchParams
  const p = paginaDe(pagina)
  const cat = categoria && CATEGORIA_LABEL[categoria] ? categoria : undefined
  const titulo = ['Galería', cat && CATEGORIA_LABEL[cat], p > 1 && `Página ${p}`].filter(Boolean).join(' — ')
  return metaPagina({ titulo, descripcion: 'Fotos de la academia: cursos, talleres y trabajos de los alumnos.', ruta: hrefPagina('/galeria', { categoria: cat }, p) })
}

export default async function GaleriaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams // ?categoria=aulas: link desde la sección «Aulas»
  const fotos = await query<Foto[]>('galeria', (sb) => sb.from('cms_galeria').select('id, imagen_url, alt, descripcion, categoria, area').order('orden'), [])
  const categorias = [...new Set(fotos.map((f) => f.categoria))]
  const cat = sp.categoria && categorias.includes(sp.categoria) ? sp.categoria : 'todas'
  const filtradas = cat === 'todas' ? fotos : fotos.filter((f) => f.categoria === cat)
  const { pagina, totalPaginas, items, desde, hasta } = paginar(filtradas, sp.pagina, POR_PAGINA)
  const hrefDe = (p: number) => hrefPagina('/galeria', { categoria: cat === 'todas' ? undefined : cat }, p)
  // Una página que no existe (o una categoría desconocida) redirige a la URL válida: título, canónica y contenido coinciden.
  if ((sp.pagina && pagina !== paginaDe(sp.pagina)) || (sp.categoria && cat === 'todas')) redirect(hrefDe(pagina))
  return (
    <div className="flex min-h-screen flex-col text-on-surface">
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="grow outline-hidden">
        <EncabezadoPagina titulo="Galería" bajada="Nuestras aulas, las clases y los trabajos de quienes pasaron por la academia." />
        <section id="fotos" className="mx-auto max-w-[1280px] scroll-mt-28 px-4 py-14 md:px-12">
          <Galeria fotos={items} categorias={categorias} categoria={cat} prioridad={pagina === 1} vacio={cat === 'todas' ? undefined : 'Todavía no hay fotos en esta categoría.'} />
          <Paginas actual={pagina} total={totalPaginas} href={(p) => `${hrefDe(p)}#fotos`} etiqueta="Páginas de la galería" resumen={`Mostrando ${desde}–${hasta} de ${filtradas.length} fotos`} />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
