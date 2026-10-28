import { Suspense } from 'react'
import type { Metadata } from 'next'
import { metaPagina } from '@/lib/seo'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import CursoCard from '@/components/public/CursoCard'
import CursosFilters from '@/components/public/CursosFilters'
import DemandaForm from '@/components/public/DemandaForm'
import { getCursos, getHorarios, getSettings, query, waLink } from '@/lib/data'

export const metadata: Metadata = metaPagina({ titulo: 'Cursos y talleres', descripcion: 'Cursos y talleres presenciales en Córdoba: reparación y tecnología, y diseño. Fechas, horarios y cupos.', ruta: '/cursos' })
export const dynamic = 'force-dynamic' // cupos en tiempo real

type SP = Record<string, string | undefined>

export default async function CursosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const f = await searchParams
  const [cursos, horarios, settings, mods] = await Promise.all([
    getCursos(), getHorarios(), getSettings(),
    query<{ curso_id: string; titulo: string }[]>('modulos-todos', (sb) => sb.from('modulos_publicos').select('curso_id, titulo').order('orden'), []),
  ])

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
    <div className="flex min-h-screen flex-col text-on-surface">
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="grow outline-hidden">
        <EncabezadoPagina titulo="Cursos y talleres" bajada="Formación 100% presencial en La Rioja 345, Córdoba. Cursos de varias semanas y talleres cortos: una jornada, días seguidos o 1 a 2 semanas.">
          <Suspense fallback={<div className="min-h-36" aria-hidden />}><CursosFilters /></Suspense>
        </EncabezadoPagina>

        <section className="mx-auto max-w-[1280px] px-4 py-14 md:px-12">
          <p role="status" className="mb-8 flex items-baseline gap-2 text-on-surface-variant"><span className="display text-3xl tabular-nums text-on-surface">{lista.length}</span> resultado{lista.length === 1 ? '' : 's'}</p>
          {lista.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="display mb-2 text-2xl [font-stretch:105%]">No encontramos cursos</p>
              <p className="mb-6 text-on-surface-variant">Probá con otros filtros o contanos qué te gustaría aprender.</p>
              <div className="mx-auto max-w-md"><DemandaForm /></div>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline mt-6">Consultar por WhatsApp</a>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <h2 className="sr-only">Resultados</h2>
              {lista.map((c) => <div key={c.id} className="al-entrar h-full"><CursoCard c={c} horarios={horarios.filter((h) => h.edicion_id === c.edicion_id)} modulos={mods.filter((m) => m.curso_id === c.id).map((m) => m.titulo)} /></div>)}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
