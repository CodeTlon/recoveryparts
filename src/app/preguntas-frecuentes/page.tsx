import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import { query } from '@/lib/data'

export const metadata: Metadata = { title: 'Preguntas frecuentes', description: 'Respuestas a las dudas más comunes sobre cursos, talleres y el campus.' }
export const dynamic = 'force-dynamic'

export default async function FaqPage() {
  const faq = await query<{ id: string; pregunta: string; respuesta: string }[]>((sb) => sb.from('cms_faq').select('id, pregunta, respuesta').order('orden'), [])
  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="flex-grow pt-20 outline-none">
        <section className="grid-bg border-b border-outline-variant">
          <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-12">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Preguntas frecuentes</h1>
            <p className="max-w-2xl text-lg text-on-surface-variant">Todo lo que suelen preguntarnos antes de empezar.</p>
          </div>
        </section>
        <section className="mx-auto max-w-3xl px-4 py-14">
          {faq.length === 0 && <p className="text-on-surface-variant">Todavía no hay preguntas cargadas.</p>}
          <div className="space-y-3">
            {faq.map((f) => (
              <details key={f.id} className="card group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.pregunta}<ChevronDown size={20} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-3 whitespace-pre-line text-on-surface-variant">{f.respuesta}</p>
              </details>
            ))}
          </div>
          <div className="card mt-10 p-6 text-center">
            <p className="font-semibold">¿No encontraste lo que buscabas?</p>
            <Link href="/contacto" className="btn-primary mt-4 inline-flex">Escribinos</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
