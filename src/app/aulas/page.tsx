import type { Metadata } from 'next'
import { Cpu, ShieldCheck, Sofa, Sparkles, Table, Wrench, type LucideIcon } from 'lucide-react'
import { metaPagina, recortar } from '@/lib/seo'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
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
    <div className="flex min-h-screen flex-col text-on-surface">
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="grow outline-hidden">
        <EncabezadoPagina titulo="Aulas" bajada={<span className="whitespace-pre-line">{s.aulas.texto || 'Conocé los espacios donde vas a cursar.'}</span>} />

        {!aulas.length ? (
          <section className="mx-auto max-w-[1280px] px-4 py-14 md:px-12">
            <p className="card p-10 text-center text-on-surface-variant">Pronto vas a poder conocer nuestras aulas.</p>
          </section>
        ) : (
          <>
            {video && (
              <section aria-label="Video de las aulas" className="mx-auto max-w-[1280px] px-4 pt-14 md:px-12">
                <div className="al-entrar overflow-hidden rounded-card border border-outline-variant">
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
                  <a key={a.id} href={`#${ancla(a.nombre)}`} className="rounded-pill border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:border-on-surface hover:text-on-surface">{a.nombre}</a>
                ))}
              </nav>
            )}

            <div className="mx-auto max-w-[1280px] space-y-20 px-4 py-14 md:px-12 md:py-20">
              {aulas.map((a, n) => {
                const v = videoDelSitio(a.video_url)
                return (
                  <section key={a.id} id={ancla(a.nombre)} aria-labelledby={`${ancla(a.nombre)}-titulo`} className="scroll-mt-28 border-t border-outline-variant pt-12 first:border-t-0 first:pt-0">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                      <div className="lg:sticky lg:top-28 lg:self-start">
                        <span aria-hidden className="display mb-2 block text-6xl tabular-nums text-accent/80">{String(n + 1).padStart(2, '0')}</span>
                        <h2 id={`${ancla(a.nombre)}-titulo`} className="display mb-4 text-[clamp(2rem,3.6vw,2.9rem)]">{a.nombre}</h2>
                        {a.descripcion && <p className="mb-6 whitespace-pre-line text-lg text-on-surface-variant">{a.descripcion}</p>}
                        {a.destacados.length > 0 && (
                          <ul className="space-y-3">
                            {a.destacados.map((d, i) => {
                              const Icono = ICONO[d.tipo] ?? Sparkles
                              return (
                                <li key={i} className="flex items-start gap-3">
                                  <span aria-hidden className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-accent/40 bg-accent/10 text-accent"><Icono size={18} /></span>
                                  <span><span className="sr-only">{TIPO[d.tipo] ?? 'Destacado'}: </span>{d.texto}</span>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                      <div className="space-y-6">
                        {a.fotos.length > 0 && (
                          <Galeria fotos={a.fotos.map((f) => ({ ...f, descripcion: null }))} />
                        )}
                        {v && (
                          <div className="overflow-hidden rounded-card border border-outline-variant">
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

          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
