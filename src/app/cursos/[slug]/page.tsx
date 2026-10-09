import { imagenCurso } from '@/lib/imagen-curso'
import { duracionTexto } from '@/lib/fechas'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CheckCircle2, Star, ExternalLink, MapPin, Clock, CalendarDays, Users } from 'lucide-react'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import { Cupos, Precio, horarioTexto } from '@/components/public/CursoCard'
import { getCursos, getEdiciones, getHorarios, getSettings, query, waLink } from '@/lib/data'
import { AREA_LABEL, TIPO_LABEL, formatPrecio, fechaCorta } from '@/lib/types'
import { hrefSeguro, esMundoParts, MUNDO_PARTS_URL } from '@/lib/validar'

export const dynamic = 'force-dynamic'

async function load(slug: string) {
  const curso = (await getCursos()).find((c) => c.slug === slug)
  return curso
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await load((await params).slug)
  return { title: c?.nombre ?? 'Curso', description: c?.descripcion?.slice(0, 150) }
}

export default async function CursoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await load(slug)
  if (!c) notFound()

  const [ediciones, horarios, settings, modulos, kit, testimonios] = await Promise.all([
    getEdiciones().then((e) => e.filter((x) => x.curso_id === c.id)),
    getHorarios().then((h) => h.filter((x) => x.curso_id === c.id)),
    getSettings(),
    // RF-26: solo los títulos de los módulos (nunca clases ni material). Los talleres no tienen módulos.
    query<{ id: string; titulo: string }[]>((sb) => sb.from('modulos_publicos').select('id, titulo').eq('curso_id', c.id).order('orden'), []),
    query<{ id: string; nombre: string; descripcion: string | null; precio: number | null; link_externo: string | null; requerido?: boolean }[]>((sb) => sb.from('kit_publico').select('id, nombre, descripcion, precio, link_externo, requerido').eq('curso_id', c.id).order('orden'), []),
    query<{ id: string; nombre: string; texto: string; puntaje: number; foto_url: string | null }[]>((sb) => sb.from('cms_testimonios').select('id, nombre, texto, puntaje, foto_url').eq('curso_id', c.id).order('orden'), []),
  ])

  const foto = imagenCurso(c)
  const wa = waLink(settings.contacto.whatsapp, `Hola! Quiero info del curso ${c.nombre}`)
  const totalKit = kit.filter((k) => k.requerido !== false).reduce((s, k) => s + (k.precio ?? 0), 0)
  const row = 'flex items-start gap-3 text-sm text-on-surface-variant'

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1280px] flex-grow px-4 pb-12 pt-28 md:px-12 md:pb-20">
        <section className="mb-16 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <div className={`flex flex-col gap-6 ${foto ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
            <div className="flex flex-wrap gap-2">
              <span className="badge border border-outline-variant bg-surface-container-high text-primary">{AREA_LABEL[c.area]}</span>
              <span className="badge bg-accent text-surface">{TIPO_LABEL[c.tipo]}</span>
              {c.nivel && <span className="badge border border-outline-variant text-on-surface-variant">{c.nivel}</span>}
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{c.nombre}</h1>
            {c.descripcion && <p className="max-w-2xl whitespace-pre-line border-l-2 border-accent pl-4 text-lg leading-relaxed text-on-surface-variant">{c.descripcion}</p>}
          </div>
          {foto && (
            <div className="relative h-64 overflow-hidden rounded border border-outline-variant bg-surface-container lg:col-span-5 lg:h-[380px]">
              <Image src={foto} alt={c.nombre} fill priority sizes="(max-width:1024px) 100vw, 42vw" className="object-cover" />
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="flex flex-col gap-12 lg:col-span-8">
            {modulos.length > 0 && (
              <section>
                <h2 className="mb-1 text-2xl font-semibold">Plan de estudios</h2>
                <p className="mb-5 text-sm text-on-surface-variant">{modulos.length} módulo{modulos.length === 1 ? '' : 's'}</p>
                <ol className="flex flex-col gap-3">
                  {modulos.map((m, i) => (
                    <li key={m.id} className="card flex items-center gap-4 px-5 py-4">
                      <span className="font-mono text-xl font-bold text-accent">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-lg font-semibold">{m.titulo}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {c.requisitos && (
              <section>
                <h2 className="mb-3 text-2xl font-semibold">Requisitos previos</h2>
                <p className="whitespace-pre-line text-on-surface-variant">{c.requisitos}</p>
              </section>
            )}

            {c.profesor_nombre && (
              <section>
                <h2 className="mb-4 text-2xl font-semibold">Tu profesor</h2>
                <div className="card flex flex-col gap-5 p-6 sm:flex-row">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-outline-variant bg-surface-container-high">
                    {c.profesor_foto && <Image src={c.profesor_foto} alt={c.profesor_nombre} fill sizes="96px" className="object-cover" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{c.profesor_nombre}</h3>
                    {c.profesor_experiencia && <p className="mt-2 whitespace-pre-line text-sm text-on-surface-variant">{c.profesor_experiencia}</p>}
                    {c.profesor_certificaciones && <p className="mt-2 flex gap-2 text-sm text-on-surface-variant"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" /> {c.profesor_certificaciones}</p>}
                  </div>
                </div>
              </section>
            )}

            {c.video_url && (
              <section>
                <h2 className="mb-4 text-2xl font-semibold">Conocé las clases</h2>
                <a href={hrefSeguro(c.video_url)} target="_blank" rel="noopener noreferrer" className="btn-outline">Ver video <ExternalLink size={16} /></a>
              </section>
            )}

            {kit.length > 0 && (
              <section>
                <h2 className="mb-1 text-2xl font-semibold">Kit del curso</h2>
                <p className="mb-5 text-sm text-on-surface-variant">Precios de referencia{c.precio_actualizado_en ? `, actualizados al ${new Date(c.precio_actualizado_en + 'T00:00').toLocaleDateString('es-AR')}` : ''}. La compra se hace en el sitio de nuestro socio <a href={MUNDO_PARTS_URL} target="_blank" rel="noopener noreferrer" className="text-secondary underline-offset-4 hover:underline">Mundo Parts</a>.</p>
                {[['Necesario para cursar', kit.filter((k) => k.requerido !== false)], ['Recomendado (opcional)', kit.filter((k) => k.requerido === false)]].map(([titulo, items]) => (items as typeof kit).length > 0 && (
                  <div key={titulo as string} className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">{titulo as string}</h3>
                    <ul className="card divide-y divide-outline-variant">
                      {(items as typeof kit).map((k) => (
                        <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div>
                            <p className="font-semibold">{k.nombre}</p>
                            {k.descripcion && <p className="text-sm text-on-surface-variant">{k.descripcion}</p>}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold">{formatPrecio(k.precio)}</span>
                            {k.link_externo && <a href={k.link_externo} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-2">{esMundoParts(k.link_externo) ? 'Comprar en Mundo Parts' : 'Comprar'} <ExternalLink size={14} aria-hidden /></a>}
                          </div>
                        </li>
                      ))}
                      {titulo === 'Necesario para cursar' && <li className="flex justify-between p-4 font-bold"><span>Total de lo necesario</span><span>{formatPrecio(totalKit)}</span></li>}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {testimonios.length > 0 && (
              <section>
                <h2 className="mb-4 text-2xl font-semibold">Opiniones</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {testimonios.map((t) => (
                    <figure key={t.id} className="card p-5">
                      <div role="img" className="mb-2 flex gap-0.5 text-accent" aria-label={`${t.puntaje} de 5`}>{Array.from({ length: t.puntaje }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}</div>
                      <blockquote className="text-sm text-on-surface-variant">{t.texto}</blockquote>
                      <figcaption className="mt-3 text-sm font-semibold">{t.nombre}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="lg:col-span-4">
            <div className="flex flex-col gap-6 lg:sticky lg:top-[100px]">
              <div className="card flex flex-col gap-5 bg-surface-container p-6 shadow-lg shadow-black/40">
                <h2 className="text-2xl font-semibold">Inversión</h2>
                <div>
                  <Precio c={c} size="text-4xl" />
                  {c.descuento_pct ? <span className="badge ml-2 bg-accent text-surface">-{c.descuento_pct}%</span> : null}
                </div>
                <div className="h-px bg-outline-variant" />
                {c.duracion_semanas && <p className={row}><Clock size={18} className="mt-0.5 shrink-0" /> {duracionTexto(c.duracion_semanas)} · La Rioja 345</p>}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary">Próximas fechas</h3>
                  {!ediciones.length ? (
                    <p className="rounded border border-dashed border-outline-variant p-4 text-sm text-on-surface-variant"><strong className="block text-on-surface">Próximamente nuevas fechas</strong> Consultanos y te avisamos cuando abra la próxima edición.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {ediciones.map((e) => {
                        const h = horarioTexto(horarios.filter((x) => x.edicion_id === e.id))
                        return (
                          <li key={e.id} className="rounded border border-outline-variant p-4">
                            <p className="flex items-center gap-2 font-semibold"><CalendarDays size={16} className="shrink-0 text-accent" /> Inicia el {fechaCorta(e.fecha_inicio)}</p>
                            {h && <p className="mt-1 pl-6 text-sm text-on-surface-variant">{h}</p>}
                            {e.aula && <p className="mt-1 flex items-center gap-2 pl-6 text-sm text-on-surface-variant"><MapPin size={14} className="shrink-0" /> {e.aula}</p>}
                            <p className="mt-2 flex items-center gap-2 pl-6"><Users size={14} className="shrink-0 text-on-surface-variant" /> <Cupos n={e.cupos_disponibles} /></p>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary w-full !py-4">Consultar por WhatsApp</a>}
                <p className="text-xs text-on-surface-variant">La inscripción y el pago se gestionan por el medio que te indiquemos al consultar.</p>
              </div>
              <Link href="/cursos" className="text-center text-sm text-on-surface-variant hover:text-secondary">← Ver todos los cursos</Link>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
