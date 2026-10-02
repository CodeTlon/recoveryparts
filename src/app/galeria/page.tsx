import type { Metadata } from 'next'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import { createClient } from '@/lib/supabase/server'
import { GaleriaLightbox } from '@/components/public/GaleriaLightbox'

export const metadata: Metadata = {
  title: 'Galería — Recovery Parts',
  description: 'Aulas, clases en acción, trabajos de alumnos y egresados de Recovery Parts.',
}

const CATEGORIA_LABEL: Record<string, string> = {
  aulas: 'Aulas', clases: 'Clases en acción', trabajos_alumnos: 'Trabajos de alumnos', egresados: 'Egresados', eventos: 'Eventos',
}

export default async function GaleriaPage() {
  const supabase = await createClient()
  const { data: fotos } = await supabase.from('galeria_fotos').select('*').eq('publicado', true).order('categoria').order('orden')

  const porCategoria = new Map<string, typeof fotos>()
  for (const f of fotos ?? []) porCategoria.set(f.categoria, [...(porCategoria.get(f.categoria) ?? []), f])

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-grow pt-28 pb-20 w-full max-w-[1280px] mx-auto px-4 md:px-12">
        <header className="mb-12 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-primary mb-3 tracking-tight">Galería</h1>
          <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">Nuestras aulas, alumnos en acción y trabajos técnicos.</p>
        </header>

        {[...porCategoria.entries()].map(([categoria, fs]) => (
          <section key={categoria} className="mb-16">
            <h2 className="text-2xl font-semibold text-on-surface mb-6">{CATEGORIA_LABEL[categoria] ?? categoria}</h2>
            <GaleriaLightbox
              fotos={(fs ?? []).map((f, i) => ({ id: f.id, url: f.url, alt: f.alt, descripcion: f.descripcion, categoria: f.categoria, destacada: i === 0 }))}
            />
          </section>
        ))}

        {!fotos?.length && <p className="text-on-surface-variant text-center py-20">Todavía no hay fotos cargadas.</p>}
      </main>
      <SiteFooter />
    </div>
  )
}
