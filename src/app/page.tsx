import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Star, ChevronDown, Search } from 'lucide-react'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import CursoCard from '@/components/public/CursoCard'
import ContactForm from '@/components/public/ContactForm'
import AuroraBackground from '@/components/ui/AuroraBackground'
import BlurText from '@/components/ui/BlurText'
import Marquee from '@/components/ui/Marquee'
import SectionTitle from '@/components/ui/SectionTitle'
import Reveal from '@/components/ui/Reveal'
import CountUp from '@/components/ui/CountUp'
import { WhatsAppIcon } from '@/components/layout/SocialIcons'
import { getCursos, getHorarios, getSettings, query, waLink } from '@/lib/data'
import { AREA_LABEL, type Area } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Egresado = { id: string; nombre: string; especialidad: string; foto_url: string | null; destacado: boolean }
type Testimonio = { id: string; nombre: string; curso: string | null; texto: string; puntaje: number; foto_url: string | null }
type Faq = { id: string; pregunta: string; respuesta: string }

export default async function Home() {
  const [s, cursos, horarios, egresados, testimonios, faq] = await Promise.all([
    getSettings(), getCursos(), getHorarios(),
    query<Egresado[]>((sb) => sb.from('cms_egresados').select('*').order('orden').limit(10), []),
    query<Testimonio[]>((sb) => sb.from('cms_testimonios').select('id, nombre, curso, texto, puntaje, foto_url').is('curso_id', null).order('orden'), []),
    query<Faq[]>((sb) => sb.from('cms_faq').select('*').order('orden'), []),
  ])
  const destacados = cursos.filter((c) => c.destacado).slice(0, 6)
  const wa = waLink(s.contacto.whatsapp)
  const areas = (['diseno', 'tecnico'] as Area[])
  const cinta = testimonios.length > 3 // pocos: grilla; muchos: cinta que se desplaza
  const card = (t: Testimonio) => (
    <figure key={t.id} className={`card flex flex-col p-6 ${cinta ? 'w-[320px] shrink-0 sm:w-[380px]' : ''}`}>
                  <div role="img" className="mb-3 flex gap-0.5 text-accent" aria-label={`${t.puntaje} de 5`}>{Array.from({ length: t.puntaje }).map((_, i) => <Star key={i} size={18} fill="currentColor" />)}</div>
                  <blockquote className="flex-1 text-on-surface-variant">{t.texto}</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-container-high">{t.foto_url && <Image src={t.foto_url} alt="" fill sizes="40px" className="object-cover" />}</span>
                    <span><span className="block text-sm font-semibold">{t.nombre}</span>{t.curso && <span className="text-xs text-on-surface-variant">{t.curso}</span>}</span>
                  </figcaption>
                </figure>
  )

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <SiteNav />
      <main id="contenido" tabIndex={-1}>
        {/* 1 · Hero */}
        <section className="relative flex min-h-[85vh] items-center overflow-hidden pt-20">
          {s.hero.imagen_url && <Image src={s.hero.imagen_url} alt="" fill priority sizes="100vw" className="object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/85 to-surface/40" />
          <div className="pointer-events-none absolute -bottom-1/4 -left-1/4 h-[500px] w-[500px] rounded-full bg-accent/20 blur-[130px]" />
          <div className="relative mx-auto w-full max-w-[1280px] px-4 py-20 md:px-12">
            <BlurText text={s.hero.titulo || 'Aprendé un oficio con equipos reales'} className="mb-6 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl" />
            <p className="mb-10 max-w-2xl text-lg text-on-surface-variant md:text-xl">{s.hero.subtitulo || 'Cursos y talleres presenciales en Córdoba.'}</p>
            <form action="/cursos" role="search" className="mb-8 flex max-w-xl items-center gap-2 rounded-pill border border-outline-variant bg-surface-container/80 p-1.5 pl-5 shadow-card backdrop-blur focus-within:border-accent">
              <Search size={18} aria-hidden className="shrink-0 text-on-surface-variant" />
              <input name="q" type="search" aria-label="Buscar cursos" placeholder="¿Qué querés aprender? Ej: celulares, diseño…" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none" />
              <button className="btn-primary !rounded-pill !px-5 !py-2.5">Buscar</button>
            </form>
            <div className="flex flex-wrap gap-4">
              <Link href="/cursos" className="btn-primary !px-8 !py-4">{s.hero.cta_cursos || 'Ver cursos'} <ArrowRight size={18} /></Link>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline !px-8 !py-4"><WhatsAppIcon size={18} /> {s.hero.cta_whatsapp || 'WhatsApp'}</a>}
            </div>
          </div>
        </section>

        {/* 2 · Las dos áreas */}
        <section className="mx-auto max-w-[1280px] px-4 py-20 md:px-12">
          <div className="grid gap-6 md:grid-cols-2">
            {areas.map((a) => {
              const cfg = s.areas[a]
              return (
                <Link key={a} href={`/cursos?area=${a}`} className={`card group relative flex min-h-[300px] flex-col justify-end overflow-hidden p-8 transition-colors hover:border-accent ${a === 'diseno' ? 'border-t-4 border-t-accent' : 'border-t-4 border-t-brand-light'}`}>
                  {cfg.imagen_url && <Image src={cfg.imagen_url} alt="" fill sizes="50vw" className="object-cover opacity-40 transition-opacity group-hover:opacity-50" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/90 to-surface/20" />
                  <div className="relative">
                    <h2 className="mb-2 text-2xl font-bold">{cfg.titulo || AREA_LABEL[a]}</h2>
                    {cfg.texto && <p className="mb-4 text-on-surface-variant">{cfg.texto}</p>}
                    <span className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-secondary">Ver cursos <ArrowRight size={16} /></span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* 3 · Destacadas */}
        {destacados.length > 0 && (
          <section className="grid-bg border-y border-outline-variant">
            <div className="mx-auto max-w-[1280px] px-4 py-20 md:px-12">
              <SectionTitle eyebrow="Formación presencial">Capacitaciones <em>destacadas</em></SectionTitle>
              <nav aria-label="Filtrar por área" className="-mt-4 mb-8 flex flex-wrap gap-2">
                {[['/cursos', 'Todos'], ['/cursos?area=diseno', AREA_LABEL.diseno], ['/cursos?area=tecnico', AREA_LABEL.tecnico], ['/cursos?tipo=taller', 'Talleres']].map(([href, label]) => (
                  <Link key={href} href={href} className="rounded-pill border border-outline-variant px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant transition-colors hover:border-accent hover:text-accent">{label}</Link>
                ))}
              </nav>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {destacados.map((c, i) => <Reveal key={c.id} delay={i * 0.06} className="h-full"><CursoCard c={c} horarios={horarios.filter((h) => h.curso_id === c.id)} /></Reveal>)}
              </div>
            </div>
          </section>
        )}

        {/* 4 · Egresados */}
        {egresados.length > 0 && (
          <section className="mx-auto max-w-[1280px] px-4 py-20 md:px-12">
            <SectionTitle eyebrow="Egresados">Construyendo <em>profesionales</em></SectionTitle>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:auto-rows-[200px]">
              {egresados.map((e) => (
                <figure key={e.id} className={`relative overflow-hidden rounded border border-outline-variant bg-surface-container ${e.destacado ? 'col-span-2 row-span-2 aspect-square md:aspect-auto' : 'aspect-square md:aspect-auto'}`}>
                  {e.foto_url && <Image src={e.foto_url} alt={`${e.nombre}, ${e.especialidad}`} fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover" />}
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10">
                    <p className="text-sm font-semibold">{e.nombre}</p>
                    <p className="text-xs text-on-surface-variant">{e.especialidad}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* 5 · Nosotros + stats */}
        {(s.nosotros.titulo || s.nosotros.texto) && (
          <section className="relative overflow-hidden border-y border-outline-variant bg-gradient-to-br from-brand-dark via-surface-container-lowest to-surface-container-lowest">
            <AuroraBackground className="opacity-60" />
            <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-12">
              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-accent">Nosotros</span>
                <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">{s.nosotros.titulo}</h2>
                <p className="whitespace-pre-line text-lg text-on-surface-variant">{s.nosotros.texto}</p>
              </div>
              <dl className="grid grid-cols-3 gap-4 self-center text-center">
                {([['aulas', 'Aulas'], ['profesores', 'Profesores'], ['egresados', 'Egresados']] as const).map(([k, l]) => (
                  s.stats[k] != null && <Reveal key={k}><div className="rounded-card border border-white/10 bg-white/5 p-5 backdrop-blur"><dd className="text-4xl font-bold text-accent md:text-5xl"><CountUp to={Number(s.stats[k])} /></dd><dt className="mt-1 text-xs uppercase tracking-wider text-on-surface-variant">{l}</dt></div></Reveal>
                ))}
              </dl>
            </div>
          </section>
        )}

        {/* 6 · Testimonios */}
        {testimonios.length > 0 && (
          <section className="mx-auto max-w-[1280px] px-4 py-20 md:px-12">
            <SectionTitle eyebrow="Testimonios">Lo que dicen <em>nuestros alumnos</em></SectionTitle>
            {cinta
              ? <Marquee>{testimonios.map(card)}</Marquee>
              : <div className="grid gap-6 md:grid-cols-3">{testimonios.map(card)}</div>}
          </section>
        )}

        {/* 7 · FAQ */}
        {faq.length > 0 && (
          <section className="border-t border-outline-variant bg-surface-container-lowest">
            <div className="mx-auto max-w-3xl px-4 py-20">
              <SectionTitle eyebrow="Ayuda" align="center">Preguntas <em>frecuentes</em></SectionTitle>
              <div className="space-y-3">
                {faq.map((f) => (
                  <details key={f.id} className="card group p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{f.pregunta}<ChevronDown size={20} className="shrink-0 transition-transform group-open:rotate-180" /></summary>
                    <p className="mt-3 whitespace-pre-line text-on-surface-variant">{f.respuesta}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 8 · Contacto */}
        <section id="contacto" className="scroll-mt-20 border-t border-outline-variant">
          <div className="mx-auto max-w-2xl px-4 py-20">
            <SectionTitle eyebrow="Escribinos" align="center" className="!mb-6"><em>Contacto</em></SectionTitle>
            <p className="mb-8 text-center text-on-surface-variant">Escribinos y te respondemos a la brevedad.</p>
            <ContactForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
