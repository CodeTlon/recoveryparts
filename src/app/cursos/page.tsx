import { Suspense } from 'react'
import type { Metadata } from 'next'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import Reveal from '@/components/ui/Reveal'
import CursoCard from '@/components/public/CursoCard'
import CursosFilters from '@/components/public/CursosFilters'
import DemandaForm from '@/components/public/DemandaForm'
import { getCursos, getHorarios, getSettings, waLink } from '@/lib/data'

export const metadata: Metadata = { title: 'Cursos y talleres' }
export const dynamic = 'force-dynamic' // cupos en tiempo real

type SP = Record<string, string | undefined>

export default async function CursosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const f = await searchParams
  const [cursos, horarios, settings] = await Promise.all([getCursos(), getHorarios(), getSettings()])

  const q = f.q?.trim().toLowerCase()
  let lista = cursos.filter((c) =>
    (!f.area || c.area === f.area) &&
    (!f.tipo || c.tipo === f.tipo) &&
    (!f.nivel || c.nivel?.toLowerCase() === f.nivel) &&
    (!f.dia || horarios.some((h) => h.curso_id === c.id && String(h.dia_semana) === f.dia)) &&
    (!q || `${c.nombre} ${c.descripcion ?? ''}`.toLowerCase().includes(q))
  )
  if (f.orden === 'precio') lista = [...lista].sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity))
  else if (f.orden === 'proximos') lista = [...lista].sort((a, b) => (a.fecha_inicio ?? '9999').localeCompare(b.fecha_inicio ?? '9999'))
  else lista = [...lista].sort((a, b) => Number(b.destacado) - Number(a.destacado))

  const wa = waLink(settings.contacto.whatsapp, 'Hola! No encontré el curso que busco.')

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="flex-grow pt-20 outline-none">
        <section className="grid-bg border-b border-outline-variant">
          <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-12">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Cursos y talleres</h1>
            <p className="max-w-2xl text-lg text-on-surface-variant">Formación 100% presencial en La Rioja 345, Córdoba. Cursos de varios meses y talleres de 1 a 2 clases.</p>
            <Suspense fallback={<div className="min-h-[9rem]" aria-hidden />}><CursosFilters /></Suspense>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 py-14 md:px-12">
          <p className="mb-6 text-sm uppercase tracking-widest text-on-surface-variant">{lista.length} resultado{lista.length === 1 ? '' : 's'}</p>
          {lista.length === 0 ? (
            <div className="card grid-bg p-10 text-center">
              <p className="mb-2 text-lg font-semibold">No encontramos cursos</p>
              <p className="mb-6 text-on-surface-variant">Probá con otros filtros o contanos qué te gustaría aprender.</p>
              <div className="mx-auto max-w-md"><DemandaForm /></div>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline mt-6">Consultar por WhatsApp</a>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((c, i) => <Reveal key={c.id} delay={Math.min(i, 8) * 0.05} className="h-full"><CursoCard c={c} horarios={horarios.filter((h) => h.curso_id === c.id)} /></Reveal>)}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
