import type { Metadata } from 'next'
import { hrefSeguro } from '@/lib/validar'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Star, Plus, Search } from 'lucide-react'
import SiteNav from '@/components/layout/SiteNav'
import HeroVideo from '@/components/public/HeroVideo'
import SiteFooter from '@/components/layout/SiteFooter'
import CursoCard, { AREA_COLOR, Cupos, horarioTexto } from '@/components/public/CursoCard'
import DestacadosFiltro, { type FiltroDestacados } from '@/components/public/DestacadosFiltro'
import CircuitField from '@/components/ui/CircuitField'
import TituloExpandido from '@/components/ui/TituloExpandido'
import Magnetico from '@/components/ui/Magnetico'
import SectionTitle from '@/components/ui/SectionTitle'
import { WhatsAppIcon } from '@/components/layout/SocialIcons'
import { getCursos, getHorarios, getSettings, hayAulasVisibles, query, waLink } from '@/lib/data'
import { AREA_LABEL, type Area } from '@/lib/types'
import { NOMBRE_SITIO } from '@/lib/seo'
import { siteUrl } from '@/lib/env'
import JsonLd from '@/components/seo/JsonLd'

export const metadata: Metadata = { alternates: { canonical: '/' } }

export const dynamic = 'force-dynamic'

type Egresado = { id: string; nombre: string; especialidad: string; foto_url: string | null; destacado: boolean }
type Testimonio = { id: string; nombre: string; curso: string | null; texto: string; puntaje: number; foto_url: string | null }
type Faq = { id: string; pregunta: string; respuesta: string }

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export default async function Home() {
  const [s, cursos, horarios, egresados, testimonios, faq, conAulas] = await Promise.all([
    getSettings(), getCursos(), getHorarios(),
    query<Egresado[]>('egresados', (sb) => sb.from('cms_egresados').select('*').order('orden').limit(4), []),
    query<Testimonio[]>('testimonios-home', (sb) => sb.from('cms_testimonios').select('id, nombre, curso, texto, puntaje, foto_url').is('curso_id', null).order('orden'), []),
    query<Faq[]>('faq-home', (sb) => sb.from('cms_faq').select('*').order('orden'), []),
    hayAulasVisibles(), // RF-60: link «Conocé nuestras aulas» en «Nosotros»
  ])
  // Filtro de destacadas: «Todos» son las destacadas; cada área y los talleres muestran primero las destacadas y después
  // las que empiezan antes. Hasta 4 por filtro (3 en escritorio); un filtro sin cursos no se ofrece.
  const enOrden = [...cursos].sort((a, b) => Number(b.destacado) - Number(a.destacado) || (a.fecha_inicio ?? '9999').localeCompare(b.fecha_inicio ?? '9999'))
  const primeros = (f: (c: (typeof cursos)[number]) => boolean) => enOrden.filter(f).slice(0, 4).map((c) => c.id)
  const destacados = cursos.filter((c) => c.destacado)
  const filtros: FiltroDestacados[] = [
    { clave: 'todos', label: 'Todos', corto: 'Todos', href: '/cursos', ids: destacados.length ? destacados.slice(0, 4).map((c) => c.id) : primeros(() => true) },
    { clave: 'tecnico', label: AREA_LABEL.tecnico, corto: 'Reparación', href: '/cursos?area=tecnico', ids: primeros((c) => c.area === 'tecnico') },
    { clave: 'diseno', label: AREA_LABEL.diseno, corto: 'Diseño', href: '/cursos?area=diseno', ids: primeros((c) => c.area === 'diseno') },
    { clave: 'taller', label: 'Talleres', corto: 'Talleres', href: '/cursos?tipo=taller', ids: primeros((c) => c.tipo === 'taller') },
  ].filter((f) => f.ids.length > 0)
  // Agenda: los próximos inicios reales (cursos con fecha de la próxima edición), del más cercano al más lejano.
  const proximos = cursos.filter((c) => c.fecha_inicio).sort((a, b) => a.fecha_inicio!.localeCompare(b.fecha_inicio!)).slice(0, 6)
  const wa = waLink(s.contacto.whatsapp)
  const areas = (['tecnico', 'diseno'] as Area[])
  const cifras = ([['aulas', 'Aulas'], ['profesores', 'Profesores'], ['egresados', 'Egresados']] as const)
    .map(([k, l]) => [Number(s.stats[k]), l] as const).filter(([n]) => Number.isFinite(n) && n > 0)
  const [principal, ...otrosTestimonios] = testimonios
  const estrellas = (n: number, size: number) => (
    <div role="img" className="flex gap-0.5 text-accent" aria-label={`${n} de 5`}>{Array.from({ length: n }).map((_, i) => <Star key={i} size={size} fill="currentColor" aria-hidden />)}</div>
  )

  const base = siteUrl().replace(/\/$/, '')
  const ig = s.contacto.instagram?.replace('@', '')
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'EducationalOrganization',
    name: NOMBRE_SITIO, url: base, logo: `${base}/images/logo.png`, description: s.hero.subtitulo || undefined,
    ...(s.contacto.direccion ? { address: { '@type': 'PostalAddress', streetAddress: s.contacto.direccion, addressLocality: 'Córdoba', addressCountry: 'AR' } } : {}),
    ...(s.contacto.telefono ? { telephone: s.contacto.telefono } : {}),
    ...(s.contacto.email ? { email: s.contacto.email } : {}),
    ...(ig ? { sameAs: [`https://www.instagram.com/${ig}/`] } : {}),
  }

  return (
    <div className="min-h-screen text-on-surface">
      <JsonLd datos={jsonLd} />
      <SiteNav />
      <main id="contenido" tabIndex={-1}>
        {/* 1 · Hero: foto o video del CMS, velo navy y el circuito vivo encima (reacciona al puntero y al clic). */}
        <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pt-28">
          {s.hero.imagen_url && <Image src={s.hero.imagen_url} alt="" fill priority sizes="100vw" className="object-cover" />}
          {hrefSeguro(s.hero.video_url) && <HeroVideo src={hrefSeguro(s.hero.video_url)!} poster={s.hero.imagen_url || undefined} />}
          <div aria-hidden className="absolute inset-0 bg-linear-to-r from-surface via-surface/85 to-surface/45" />
          <div aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-surface" />
          <CircuitField modo="hero" />

          <div className="relative mx-auto w-full max-w-[1280px] px-4 pb-10 md:px-12 md:pb-14">
            <TituloExpandido texto={s.hero.titulo || 'Aprendé un oficio con equipos reales'} className="max-w-5xl text-[clamp(2.6rem,7.4vw,6.4rem)]" />
            <p className="mt-6 max-w-2xl text-lg text-on-surface-variant md:text-xl">{s.hero.subtitulo || 'Cursos y talleres presenciales en Córdoba.'}</p>

            <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center">
              <form action="/cursos" role="search" className="flex w-full max-w-xl items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest/80 p-1.5 pl-4 shadow-card backdrop-blur-md transition-colors focus-within:border-accent">
                <Search size={18} aria-hidden className="shrink-0 text-on-surface-variant" />
                <input name="q" type="search" aria-label="Buscar cursos" placeholder="¿Qué querés aprender?" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-hidden" />
                <button className="btn-primary px-4! py-2.5!">Buscar</button>
              </form>
              <div className="flex flex-wrap gap-3">
                <Magnetico><Link href="/cursos" className="btn-primary px-6! py-3.5!">{s.hero.cta_cursos || 'Ver cursos'} <ArrowRight size={18} aria-hidden /></Link></Magnetico>
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline px-6! py-3.5!"><WhatsAppIcon size={18} /> {s.hero.cta_whatsapp || 'WhatsApp'}</a>}
              </div>
            </div>

            {/* Franja de datos reales: solo lo que está cargado. */}
            <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-outline-variant/70 pt-6 md:grid-cols-4">
              <div><dt className="dato">Modalidad</dt><dd className="mt-1 font-semibold">100% presencial</dd></div>
              {s.contacto.direccion && <div><dt className="dato">Dónde</dt><dd className="mt-1 font-semibold">{s.contacto.direccion}</dd></div>}
              {proximos[0] && <div><dt className="dato">Próximo inicio</dt><dd className="mt-1 font-semibold"><Link href={`/cursos/${proximos[0].slug}`} className="underline-offset-4 hover:text-accent hover:underline">{proximos[0].fecha_inicio!.slice(8, 10)} {MESES[Number(proximos[0].fecha_inicio!.slice(5, 7)) - 1]} · {proximos[0].nombre}</Link></dd></div>}
              {s.contacto.horario && <div><dt className="dato">Atención</dt><dd className="mt-1 font-semibold">{s.contacto.horario}</dd></div>}
            </dl>
          </div>
        </section>

        {/* 2 · Las dos áreas: las dos mitades del logo. La mitad con el puntero se ensancha (.diptico). */}
        <section aria-label="Áreas" className="mx-auto max-w-[1280px] px-4 py-16 md:px-12 md:py-28">
          <div className="diptico grid gap-4">
            {areas.map((a) => {
              const cfg = s.areas[a]
              const color = AREA_COLOR[a]
              return (
                <Link key={a} href={`/cursos?area=${a}`} className={`al-entrar group relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-card border border-outline-variant bg-surface-container-low p-7 transition-colors ${color.bordeHover} md:min-h-[460px] md:p-10`}>
                  {cfg.imagen_url && <span aria-hidden className="absolute inset-0 overflow-hidden"><Image src={cfg.imagen_url} alt="" fill sizes="(max-width:768px) 100vw, 720px" className="paralaje object-cover opacity-45 grayscale-[35%] transition-[opacity,filter] duration-700 group-hover:opacity-60 group-hover:grayscale-0" /></span>}
                  <span aria-hidden className="absolute inset-0 bg-linear-to-t from-surface-container-lowest via-surface-container-lowest/75 to-transparent" />
                  <span aria-hidden className={`absolute inset-x-0 top-0 h-1 origin-left scale-x-25 transition-transform duration-700 ease-(--ease-out) group-hover:scale-x-100 ${color.fondo}`} />
                  <div className="relative">
                    <span className={`dato mb-3 inline-flex items-center gap-2 ${color.texto}`}><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${color.fondo}`} /> Área</span>
                    <h2 className="display text-[clamp(2rem,4vw,3.25rem)]">{cfg.titulo || AREA_LABEL[a]}</h2>
                    {cfg.texto && <p className="mt-3 max-w-md text-on-surface-variant">{cfg.texto}</p>}
                    <span className="mt-6 inline-flex items-center gap-2 font-semibold">Ver cursos <ArrowRight size={18} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" /></span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* 3 · Próximos inicios (agenda) */}
        {proximos.length > 0 && (
          <section aria-labelledby="t-proximos" className="mx-auto max-w-[1280px] px-4 pb-16 md:px-12 md:pb-28">
            <SectionTitle id="t-proximos" bajada="Las próximas ediciones con fecha confirmada. Cada curso tiene cupo limitado.">Próximos inicios</SectionTitle>
            <ol className="border-t border-outline-variant">
              {proximos.slice(0, 4).map((c) => {
                const h = horarioTexto(horarios.filter((x) => x.edicion_id === c.edicion_id))
                const color = AREA_COLOR[c.area]
                return (
                  <li key={c.id} className="al-entrar border-b border-outline-variant">
                    <Link href={`/cursos/${c.slug}`} className="group relative grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 py-5 md:grid-cols-[6rem_minmax(0,1.6fr)_minmax(0,1fr)_auto] md:gap-8 md:py-6">
                      <span aria-hidden className="absolute inset-0 -z-10 origin-left scale-x-0 rounded-lg bg-surface-container-low transition-transform duration-500 ease-(--ease-out) group-hover:scale-x-100" />
                      <span className="pl-2 tabular-nums">
                        <span className="display block text-4xl leading-none md:text-5xl">{c.fecha_inicio!.slice(8, 10)}</span>
                        <span className="dato">{MESES[Number(c.fecha_inicio!.slice(5, 7)) - 1]} {c.fecha_inicio!.slice(0, 4)}</span>
                      </span>
                      <span className="min-w-0">
                        <span className={`mb-1 inline-flex items-center gap-2 text-xs font-bold ${color.texto}`}><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${color.fondo}`} /> {AREA_LABEL[c.area]}</span>
                        <span className="display block text-lg leading-tight [font-stretch:105%] md:text-2xl">{c.nombre}</span>
                        {h && <span className="mt-1 block text-sm tabular-nums text-on-surface-variant md:hidden">{h}</span>}
                      </span>
                      <span className="hidden text-sm text-on-surface-variant md:block">
                        {h && <span className="block tabular-nums">{h}</span>}
                        {c.cupos_disponibles != null && <span className="mt-1 block"><Cupos n={c.cupos_disponibles} /></span>}
                      </span>
                      <span aria-hidden className="mr-2 grid h-11 w-11 place-items-center rounded-full border border-outline-variant transition-[background-color,border-color,color,rotate] duration-300 group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent group-hover:text-surface-container-lowest">
                        <ArrowUpRight size={20} />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {/* 4 · Destacadas, con filtro que cambia las tarjetas ahí mismo */}
        {filtros.length > 0 && (
          <section aria-labelledby="t-destacados" className="border-y border-outline-variant/60 bg-surface-container-lowest/70 backdrop-blur-[2px]">
            <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-12 md:py-28">
              <DestacadosFiltro
                titulo={<SectionTitle id="t-destacados" className="mb-0!">Capacitaciones destacadas</SectionTitle>}
                filtros={filtros}
                tarjetas={Object.fromEntries([...new Set(filtros.flatMap((f) => f.ids))].map((id) => {
                  const c = cursos.find((x) => x.id === id)!
                  return [id, <CursoCard key={id} c={c} horarios={horarios.filter((h) => h.edicion_id === c.edicion_id)} />]
                }))}
              />
            </div>
          </section>
        )}

        {/* 5 · Egresados */}
        {egresados.length > 0 && (
          <section aria-labelledby="t-egresados" className="mx-auto max-w-[1280px] px-4 py-16 md:px-12 md:py-28">
            <SectionTitle id="t-egresados" bajada="Alumnos que hoy trabajan de lo que aprendieron acá.">Construyendo profesionales</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {egresados.slice(0, 4).map((e) => (
                <figure key={e.id} className="al-entrar group relative aspect-4/5 overflow-hidden rounded-card bg-surface-container">
                  {e.foto_url && <Image src={e.foto_url} alt={`${e.nombre}, ${e.especialidad}`} fill sizes="(max-width:768px) 50vw, 300px" className="object-cover transition-[scale,filter] duration-700 ease-(--ease-out) grayscale-[40%] group-hover:scale-105 group-hover:grayscale-0" />}
                  <figcaption className="absolute inset-x-2 bottom-2 rounded-lg bg-surface-container-lowest/80 px-3 py-2 backdrop-blur-md">
                    <p className="text-sm font-semibold">{e.nombre}</p>
                    <p className="text-xs text-on-surface-variant">{e.especialidad}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* 6 · Nosotros + cifras (cuentan solas al entrar, en CSS) */}
        {(s.nosotros.titulo || s.nosotros.texto) && (
          <section aria-labelledby="t-nosotros" className="relative overflow-hidden border-y border-outline-variant/60 bg-brand-dark/55 backdrop-blur-[2px]">
            <div className="relative mx-auto grid max-w-[1280px] gap-14 px-4 py-16 md:grid-cols-12 md:px-12 md:py-28">
              <div className="md:col-span-7">
                <SectionTitle id="t-nosotros" className="mb-6!">{s.nosotros.titulo || 'Nosotros'}</SectionTitle>
                <p className="max-w-[62ch] whitespace-pre-line text-lg leading-relaxed text-on-surface-variant">{s.nosotros.texto}</p>
                {conAulas && <Link href="/aulas" className="btn-outline mt-8">Conocé nuestras aulas <ArrowRight size={16} aria-hidden /></Link>}
              </div>
              {cifras.length > 0 && (
                <dl className="flex flex-col justify-center divide-y divide-outline-variant/70 border-y border-outline-variant/70 md:col-span-5">
                  {cifras.map(([n, l]) => (
                    <div key={l} className="flex items-baseline justify-between gap-6 py-6">
                      <dt className="text-lg font-semibold text-on-surface-variant">{l}</dt>
                      <dd className="display text-6xl tabular-nums text-accent md:text-7xl">
                        <span className="cifra-real">{n}</span>
                        <span aria-hidden className="cifra-animada" style={{ '--hasta': n } as React.CSSProperties} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </section>
        )}

        {/* 7 · Testimonios: una cita grande y el resto en una fila deslizable (la del centro toma foco con el scroll). */}
        {principal && (
          <section aria-labelledby="t-testimonios" className="py-16 md:py-28">
            <div className="mx-auto max-w-[1280px] px-4 md:px-12">
              <SectionTitle id="t-testimonios">Lo que dicen nuestros alumnos</SectionTitle>
              <figure className="al-entrar max-w-4xl">
                {estrellas(principal.puntaje, 20)}
                <blockquote className="display mt-5 text-[clamp(1.5rem,3.2vw,2.5rem)] font-semibold leading-snug [font-stretch:100%]">«{principal.texto}»</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-container-high">{principal.foto_url && <Image src={principal.foto_url} alt="" fill sizes="48px" className="object-cover" />}</span>
                  <span><span className="block font-semibold">{principal.nombre}</span>{principal.curso && <span className="text-sm text-on-surface-variant">{principal.curso}</span>}</span>
                </figcaption>
              </figure>
            </div>
            {otrosTestimonios.length > 0 && (
              <ul aria-label="Más opiniones" className="fila-foco mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[max(1rem,calc(50%-11.5rem))] pb-6">
                {otrosTestimonios.map((t) => (
                  <li key={t.id} className="card flex w-[min(84vw,23rem)] shrink-0 snap-center flex-col p-6">
                    {estrellas(t.puntaje, 16)}
                    <blockquote className="mt-3 flex-1 text-on-surface-variant">{t.texto}</blockquote>
                    <p className="mt-4 flex items-center gap-3">
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-container-high">{t.foto_url && <Image src={t.foto_url} alt="" fill sizes="36px" className="object-cover" />}</span>
                      <span><span className="block text-sm font-semibold">{t.nombre}</span>{t.curso && <span className="text-xs text-on-surface-variant">{t.curso}</span>}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* 8 · FAQ: título fijo a la izquierda, acordeón (altura animada nativa) a la derecha. */}
        {faq.length > 0 && (
          <section aria-labelledby="t-faq" className="border-t border-outline-variant/60 bg-surface-container-lowest/70 backdrop-blur-[2px]">
            <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-16 md:grid-cols-12 md:px-12 md:py-28">
              <div className="md:col-span-4">
                <div className="md:sticky md:top-28">
                  <SectionTitle id="t-faq" className="mb-6!">Preguntas frecuentes</SectionTitle>
                  {faq.length > 4 && <Link href="/preguntas-frecuentes" className="btn-outline">Ver todas las preguntas <ArrowRight size={16} aria-hidden /></Link>}
                </div>
              </div>
              <div className="divide-y divide-outline-variant border-y border-outline-variant md:col-span-8">
                {faq.slice(0, 4).map((f) => (
                  <details key={f.id} className="acordeon group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                      {f.pregunta}
                      <Plus size={22} aria-hidden className="shrink-0 transition-transform duration-300 ease-(--ease-out) group-open:rotate-45" />
                    </summary>
                    <p className="whitespace-pre-line pb-6 pr-10 text-on-surface-variant">{f.respuesta}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
      <SiteFooter />
    </div>
  )
}
