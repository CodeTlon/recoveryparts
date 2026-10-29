import { imagenCurso } from '@/lib/imagen-curso'
import { duracionTexto } from '@/lib/fechas'
import { ViewTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CheckCircle2, Star, ExternalLink, MapPin, Clock, CalendarDays, Users, ArrowLeft } from 'lucide-react'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import { AREA_COLOR, Cupos, Precio, horarioTexto } from '@/components/public/CursoCard'
import TituloExpandido from '@/components/ui/TituloExpandido'
import Magnetico from '@/components/ui/Magnetico'
import { getCursos, getEdiciones, getHorarios, getSettings, query, waLink } from '@/lib/data'
import { AREA_LABEL, TIPO_LABEL, formatPrecio, fechaCorta } from '@/lib/types'
import { hrefSeguro, esMundoParts, MUNDO_PARTS_URL } from '@/lib/validar'
import { metaPagina, recortar, NOMBRE_SITIO } from '@/lib/seo'
import { siteUrl } from '@/lib/env'
import JsonLd from '@/components/seo/JsonLd'

export const dynamic = 'force-dynamic'

async function load(slug: string) {
  const curso = (await getCursos()).find((c) => c.slug === slug)
  return curso
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug
  const c = await load(slug)
  if (!c) return { title: 'Curso no encontrado', robots: { index: false } }
  return metaPagina({ titulo: c.nombre, descripcion: recortar(c.descripcion) ?? `${TIPO_LABEL[c.tipo]} presencial en Córdoba.`, ruta: `/cursos/${c.slug}`, imagen: imagenCurso(c) })
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
    query<{ id: string; titulo: string }[]>(`modulos:${c.id}`, (sb) => sb.from('modulos_publicos').select('id, titulo').eq('curso_id', c.id).order('orden'), []),
    query<{ id: string; nombre: string; descripcion: string | null; precio: number | null; link_externo: string | null; requerido?: boolean }[]>(`kit:${c.id}`, (sb) => sb.from('kit_publico').select('id, nombre, descripcion, precio, link_externo, requerido').eq('curso_id', c.id).order('orden'), []),
    query<{ id: string; nombre: string; texto: string; puntaje: number; foto_url: string | null }[]>(`testimonios:${c.id}`, (sb) => sb.from('cms_testimonios').select('id, nombre, texto, puntaje, foto_url').eq('curso_id', c.id).order('orden'), []),
  ])

  const foto = imagenCurso(c)
  const wa = waLink(settings.contacto.whatsapp, `Hola! Quiero info del curso ${c.nombre}`)
  const totalKit = kit.filter((k) => k.requerido !== false).reduce((s, k) => s + (k.precio ?? 0), 0)
  const row = 'flex items-start gap-3 text-sm text-on-surface-variant'
  const base = siteUrl().replace(/\/$/, '')
  // Datos estructurados del curso (sin `offers`: la academia no vende desde el sitio, el precio es de referencia).
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Course',
    name: c.nombre, description: recortar(c.descripcion, 500), url: `${base}/cursos/${c.slug}`, inLanguage: 'es-AR',
    ...(foto ? { image: foto.startsWith('/') ? `${base}${foto}` : foto } : {}),
    ...(c.nivel ? { educationalLevel: c.nivel } : {}),
    provider: { '@type': 'EducationalOrganization', name: NOMBRE_SITIO, url: base },
    hasCourseInstance: ediciones.map((e) => ({
      '@type': 'CourseInstance', courseMode: 'onsite', startDate: e.fecha_inicio, ...(e.fecha_fin ? { endDate: e.fecha_fin } : {}),
      location: { '@type': 'Place', name: e.aula ?? NOMBRE_SITIO, ...(settings.contacto.direccion ? { address: settings.contacto.direccion } : {}) },
    })),
  }

  return (
    <div className="flex min-h-screen flex-col text-on-surface">
      <JsonLd datos={jsonLd} />
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1280px] grow px-4 pb-12 pt-28 md:px-12 md:pb-20 md:pt-36">
        <Link href="/cursos" className="-mt-2.5 mb-5.5 inline-flex items-center gap-2 py-2.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface"><ArrowLeft size={16} aria-hidden /> Todos los cursos</Link>
        <section className="mb-16 grid grid-cols-1 items-end gap-8 lg:grid-cols-12 lg:gap-10">
          <div className={`flex flex-col gap-6 ${foto ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 text-sm font-bold ${AREA_COLOR[c.area].texto}`}><span aria-hidden className={`h-2 w-2 rounded-full ${AREA_COLOR[c.area].fondo}`} /> {AREA_LABEL[c.area]}</span>
              <span aria-hidden className="text-outline">·</span>
              <span className="badge border border-outline-variant text-on-surface">{TIPO_LABEL[c.tipo]}</span>
              {c.nivel && <span className="badge border border-outline-variant capitalize text-on-surface-variant">{c.nivel}</span>}
            </div>
            <TituloExpandido texto={c.nombre} className="text-[clamp(2.4rem,5.6vw,4.6rem)]" />
            {c.descripcion && <p className="max-w-2xl whitespace-pre-line text-lg leading-relaxed text-on-surface-variant">{c.descripcion}</p>}
          </div>
          {foto && (
            <ViewTransition name={`curso-foto-${c.slug}`} share="morph" default="none">
              <div className="relative h-64 overflow-hidden rounded-card border border-outline-variant bg-surface-container sm:h-80 lg:col-span-5 lg:h-[400px]">
                <Image src={foto} alt={c.nombre} fill priority sizes="(max-width:1024px) 100vw, 560px" className="object-cover" />
              </div>
            </ViewTransition>
          )}
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="flex flex-col gap-12 lg:col-span-8">
            {modulos.length > 0 && (
              <section>
                <h2 className="display mb-1 text-3xl [font-stretch:108%]">Plan de estudios</h2>
                <p className="mb-8 text-sm text-on-surface-variant">{modulos.length} módulo{modulos.length === 1 ? '' : 's'}</p>
                {/* Línea de tiempo: una pista vertical con un nodo por módulo, como el circuito del logo. */}
                <ol className="relative ml-4 border-l border-outline-variant">
                  {modulos.map((m, i) => (
                    <li key={m.id} className="al-entrar group relative pb-6 pl-8 last:pb-0">
                      <span aria-hidden className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-accent bg-surface transition-colors group-hover:bg-accent" />
                      <span className="dato text-accent">Módulo {String(i + 1).padStart(2, '0')}</span>
                      <span className="mt-0.5 block text-lg font-semibold">{m.titulo}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {c.requisitos && (
              <section>
                <h2 className="display mb-4 text-3xl [font-stretch:108%]">Requisitos previos</h2>
                <p className="whitespace-pre-line text-on-surface-variant">{c.requisitos}</p>
              </section>
            )}

            {c.profesor_nombre && (
              <section>
                <h2 className="display mb-4 text-3xl [font-stretch:108%]">Tu profesor</h2>
                <div className="card flex flex-col gap-5 p-6 sm:flex-row">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-outline-variant bg-surface-container-high">
                    {c.profesor_foto
                      ? <Image src={c.profesor_foto} alt={c.profesor_nombre} fill sizes="96px" className="object-cover" />
                      : <span aria-hidden className="grid h-full w-full place-items-center text-2xl font-bold text-on-surface-variant">{c.profesor_nombre.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}</span>}
                  </div>
                  <div>
                    <h3 className="display text-xl [font-stretch:105%]">{c.profesor_nombre}</h3>
                    {c.profesor_experiencia && <p className="mt-2 whitespace-pre-line text-sm text-on-surface-variant">{c.profesor_experiencia}</p>}
                    {c.profesor_certificaciones && <p className="mt-2 flex gap-2 text-sm text-on-surface-variant"><CheckCircle2 size={16} aria-hidden className="mt-0.5 shrink-0 text-signal-green" /> {c.profesor_certificaciones}</p>}
                  </div>
                </div>
              </section>
            )}

            {c.video_url && (
              <section>
                <h2 className="display mb-4 text-3xl [font-stretch:108%]">Conocé las clases</h2>
                {/\.(mp4|webm)(\?|$)/i.test(c.video_url)
                  ? <video src={hrefSeguro(c.video_url)} poster={c.imagen_url || undefined} controls playsInline preload="metadata" className="max-h-[70vh] w-full rounded-card bg-black" />
                  : <a href={hrefSeguro(c.video_url)} target="_blank" rel="noopener noreferrer" className="btn-outline">Ver video <ExternalLink size={16} /></a>}
              </section>
            )}

            {kit.length > 0 && (
              <section>
                <h2 className="display mb-1 text-3xl [font-stretch:108%]">Kit del curso</h2>
                <p className="mb-5 text-sm text-on-surface-variant">Precios de referencia{c.precio_actualizado_en ? `, actualizados al ${new Date(c.precio_actualizado_en + 'T00:00').toLocaleDateString('es-AR')}` : ''}. La compra se hace en el sitio de nuestro socio <a href={MUNDO_PARTS_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-on-surface underline decoration-accent decoration-2 underline-offset-4 hover:text-accent">Mundo Parts</a>.</p>
                {[['Necesario para cursar', kit.filter((k) => k.requerido !== false)], ['Recomendado (opcional)', kit.filter((k) => k.requerido === false)]].map(([titulo, items]) => (items as typeof kit).length > 0 && (
                  <div key={titulo as string} className="mb-5">
                    <h3 className="dato mb-2">{titulo as string}</h3>
                    <ul className="card divide-y divide-outline-variant">
                      {(items as typeof kit).map((k) => (
                        <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div>
                            <p className="font-semibold">{k.nombre}</p>
                            {k.descripcion && <p className="text-sm text-on-surface-variant">{k.descripcion}</p>}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold tabular-nums">{formatPrecio(k.precio)}</span>
                            {k.link_externo && <a href={k.link_externo} target="_blank" rel="noopener noreferrer" className="btn-outline px-3! py-2!">{esMundoParts(k.link_externo) ? 'Comprar en Mundo Parts' : 'Comprar'} <ExternalLink size={14} aria-hidden /></a>}
                          </div>
                        </li>
                      ))}
                      {titulo === 'Necesario para cursar' && <li className="flex justify-between bg-surface-container/60 p-4 font-bold"><span>Total de lo necesario</span><span className="tabular-nums text-accent">{formatPrecio(totalKit)}</span></li>}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {testimonios.length > 0 && (
              <section>
                <h2 className="display mb-5 text-3xl [font-stretch:108%]">Opiniones</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {testimonios.map((t) => (
                    <figure key={t.id} className="card al-entrar p-6">
                      <div role="img" className="mb-2 flex gap-0.5 text-accent" aria-label={`${t.puntaje} de 5`}>{Array.from({ length: t.puntaje }).map((_, i) => <Star key={i} size={16} fill="currentColor" aria-hidden />)}</div>
                      <blockquote className="mt-1 text-on-surface-variant">{t.texto}</blockquote>
                      <figcaption className="mt-3 text-sm font-semibold">{t.nombre}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* En el celular el precio, las fechas y la consulta van primero (antes quedaban al final, después del kit). */}
          <aside className="order-first lg:order-none lg:col-span-4">
            <div className="flex flex-col gap-6 lg:sticky lg:top-28">
              <div className="flex flex-col gap-5 rounded-card border border-outline-variant bg-surface-container-low/90 p-6 shadow-card-hover backdrop-blur-md">
                <h2 className="dato">Inversión</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Precio c={c} size="display text-5xl" />
                  {c.descuento_pct ? <span className="badge bg-accent/15 text-accent">-{c.descuento_pct}%</span> : null}
                </div>
                <div className="h-px bg-outline-variant" />
                {c.duracion_semanas && <p className={row}><Clock size={18} className="mt-0.5 shrink-0" /> {duracionTexto(c.duracion_semanas)} · La Rioja 345</p>}
                <div>
                  <h3 className="dato mb-3">Próximas fechas</h3>
                  {!ediciones.length ? (
                    <p className="rounded-lg border border-dashed border-outline-variant p-4 text-sm text-on-surface-variant"><strong className="block text-on-surface">Próximamente nuevas fechas</strong> Consultanos y te avisamos cuando abra la próxima edición.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {ediciones.map((e) => {
                        const h = horarioTexto(horarios.filter((x) => x.edicion_id === e.id))
                        return (
                          <li key={e.id} className="rounded-lg border border-outline-variant bg-surface-container-lowest/60 p-4">
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
                {wa && <Magnetico fuerza={0.12} className="w-full"><a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary w-full py-4!">Consultar por WhatsApp</a></Magnetico>}
                <p className="text-xs text-on-surface-variant">La inscripción y el pago se gestionan por el medio que te indiquemos al consultar.</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
