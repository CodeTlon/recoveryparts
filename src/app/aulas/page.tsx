import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Cpu, ShieldCheck, Sofa, Sparkles, Table, Wrench, type LucideIcon } from 'lucide-react'
import { metaPagina, recortar } from '@/lib/seo'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import Galeria from '@/components/public/Lightbox'
import { getAulasPublicas, getSettings } from '@/lib/data'

export const dynamic = 'force-dynamic'

// RF-60: las aulas como diferencial de la academia. Solo aulas activas y visibles (las vistas públicas ya filtran);
// nunca la capacidad ni los cursos que se dictan en cada una.
const ICONO: Record<string, LucideIcon> = { mesas: Table, equipamiento: Cpu, herramientas: Wrench, comodidades: Sofa, seguridad: ShieldCheck, otro: Sparkles }
const TIPO: Record<string, string> = { mesas: 'Mesas de trabajo', equipamiento: 'Equipamiento', herramientas: 'Herramientas', comodidades: 'Comodidades', seguridad: 'Seguridad', otro: 'Destacado' }
// Ancla de cada aula en el índice (sale del nombre).
const ancla = (nombre: string) => 'aula-' + nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
// Solo videos subidos al sitio (un link externo no se puede reproducir en <video>).
const videoDelSitio = (u?: string | null) => (u && u.startsWith('/') ? u : null)

export async function generateMetadata(): Promise<Metadata> {
  const [s, aulas] = await Promise.all([getSettings(), getAulasPublicas()])
  return metaPagina({
    titulo: 'Aulas',
    descripcion: recortar(s.aulas.texto) ?? 'Conocé las aulas-taller de la academia: mesas de trabajo, equipamiento y comodidades.',
    ruta: '/aulas',
    imagen: s.aulas.imagen_url || aulas.find((a) => a.fotos.length)?.fotos[0].imagen_url,
  })
}

export default async function AulasPage() {
  const [s, aulas] = await Promise.all([getSettings(), getAulasPublicas()])
  const video = videoDelSitio(s.aulas.video_url)

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="grow pt-20 outline-hidden">
        <section className="grid-bg border-b border-outline-variant">
          <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-12">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Aulas</h1>
            <p className="max-w-2xl whitespace-pre-line text-lg text-on-surface-variant">{s.aulas.texto || 'Conocé los espacios donde vas a cursar.'}</p>
          </div>
        </section>

        {!aulas.length ? (
          <section className="mx-auto max-w-[1280px] px-4 py-14 md:px-12">
            <p className="card p-10 text-center text-on-surface-variant">Pronto vas a poder conocer nuestras aulas.</p>
          </section>
        ) : (
          <>
            {video && (
              <section aria-label="Video de las aulas" className="mx-auto max-w-[1280px] px-4 pt-14 md:px-12">
                <div className="card overflow-hidden p-0">
                  <video controls preload="metadata" playsInline poster={s.aulas.imagen_url || undefined} className="aspect-video w-full bg-black">
                    <source src={video} />
                    Tu navegador no puede reproducir este video.
                  </video>
                </div>
              </section>
            )}

            {aulas.length > 1 && (
              <nav aria-label="Ir a un aula" className="mx-auto flex max-w-[1280px] flex-wrap gap-2 px-4 pt-10 md:px-12">
                {aulas.map((a) => (
                  <a key={a.id} href={`#${ancla(a.nombre)}`} className="rounded-sm border border-outline px-4 py-2 text-sm font-semibold uppercase tracking-wide text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary">{a.nombre}</a>
                ))}
              </nav>
            )}

            <div className="mx-auto max-w-[1280px] space-y-16 px-4 py-14 md:px-12">
              {aulas.map((a) => {
                const v = videoDelSitio(a.video_url)
                return (
                  <section key={a.id} id={ancla(a.nombre)} aria-labelledby={`${ancla(a.nombre)}-titulo`} className="scroll-mt-28 border-t border-outline-variant pt-12 first:border-t-0 first:pt-0">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                      <div>
                        <h2 id={`${ancla(a.nombre)}-titulo`} className="mb-3 text-3xl font-bold tracking-tight">{a.nombre}</h2>
                        {a.descripcion && <p className="mb-6 whitespace-pre-line text-lg text-on-surface-variant">{a.descripcion}</p>}
                        {a.destacados.length > 0 && (
                          <ul className="space-y-3">
                            {a.destacados.map((d, i) => {
                              const Icono = ICONO[d.tipo] ?? Sparkles
                              return (
                                <li key={i} className="flex items-start gap-3">
                                  <span aria-hidden className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent"><Icono size={18} /></span>
                                  <span><span className="sr-only">{TIPO[d.tipo] ?? 'Destacado'}: </span>{d.texto}</span>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                      <div className="space-y-6">
                        {a.fotos.length > 0 && (
                          <Galeria filtros={false} fotos={a.fotos.map((f) => ({ ...f, descripcion: null, categoria: 'aulas', area: null }))} />
                        )}
                        {v && (
                          <div className="card overflow-hidden p-0">
                            <video controls preload="metadata" playsInline className="aspect-video w-full bg-black" aria-label={`Video de ${a.nombre}`}>
                              <source src={v} />
                              Tu navegador no puede reproducir este video.
                            </video>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>

            <section className="border-t border-outline-variant">
              <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-10 md:px-12">
                <p className="text-on-surface-variant">¿Querés ver más? Hay más fotos de las aulas en la galería.</p>
                <Link href="/galeria?categoria=aulas" className="btn-ghost">Ver más fotos en la galería <ArrowRight size={16} aria-hidden /></Link>
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
