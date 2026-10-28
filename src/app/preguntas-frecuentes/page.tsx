import type { Metadata } from 'next'
import { metaPagina } from '@/lib/seo'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import { query } from '@/lib/data'
import JsonLd from '@/components/seo/JsonLd'

export const metadata: Metadata = metaPagina({ titulo: 'Preguntas frecuentes', descripcion: 'Respuestas a las dudas más comunes sobre cursos, talleres y el campus.', ruta: '/preguntas-frecuentes' })
export const dynamic = 'force-dynamic'

export default async function FaqPage() {
  const faq = await query<{ id: string; pregunta: string; respuesta: string }[]>('faq-pagina', (sb) => sb.from('cms_faq').select('id, pregunta, respuesta').order('orden'), [])
  return (
    <div className="flex min-h-screen flex-col text-on-surface">
      {faq.length > 0 && <JsonLd datos={{
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.pregunta, acceptedAnswer: { '@type': 'Answer', text: f.respuesta } })),
      }} />}
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="grow outline-hidden">
        <EncabezadoPagina titulo="Preguntas frecuentes" bajada="Todo lo que suelen preguntarnos antes de empezar." />
        <section className="mx-auto max-w-[1280px] px-4 py-14 md:px-12 md:py-20">
          {faq.length === 0 && <p className="text-on-surface-variant">Todavía no hay preguntas cargadas.</p>}
          <div className="grid gap-12 md:grid-cols-12">
            <div className="divide-y divide-outline-variant border-y border-outline-variant md:col-span-8">
              {faq.map((f, i) => (
                <details key={f.id} className="acordeon group">
                  <summary className="flex cursor-pointer list-none items-baseline gap-5 py-5 text-lg font-semibold transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                    <span aria-hidden className="dato w-6 shrink-0 text-accent">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1">{f.pregunta}</span>
                    <Plus size={22} aria-hidden className="shrink-0 self-center transition-transform duration-300 ease-(--ease-out) group-open:rotate-45" />
                  </summary>
                  <p className="whitespace-pre-line pb-6 pl-11 pr-10 text-on-surface-variant">{f.respuesta}</p>
                </details>
              ))}
            </div>
            <aside className="md:col-span-4">
              <div className="card p-6 md:sticky md:top-28">
                <p className="display text-2xl [font-stretch:105%]">¿No encontraste lo que buscabas?</p>
                <p className="mt-2 text-on-surface-variant">Escribinos y te respondemos por mail.</p>
                <Link href="/contacto" className="btn-primary mt-6">Escribinos <ArrowRight size={16} aria-hidden /></Link>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
