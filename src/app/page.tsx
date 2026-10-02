import Link from 'next/link'
import { ArrowRight, ArrowUpRight, ChevronRight, CircuitBoard, Cpu, Palette } from 'lucide-react'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import { WhatsAppIcon } from '@/components/layout/SocialIcons'
import { createClient } from '@/lib/supabase/server'
import { getSitioConfig } from '@/lib/sitio'
import { ContactoForm } from '@/components/public/ContactoForm'
import { FaqAccordion } from '@/components/public/FaqAccordion'

const gridBg: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, rgba(143,144,151,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(143,144,151,0.05) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
}

export default async function Home() {
  const supabase = await createClient()
  const sitio = await getSitioConfig()

  const [{ data: destacados }, { data: egresados }, { data: testimonios }, { data: faqs }] = await Promise.all([
    supabase.from('cursos').select('id, slug, titulo, descripcion, tipo, area, duracion_semanas, imagenes').eq('publicado', true).eq('estado', 'activo').eq('destacado', true).order('orden_destacado').limit(3),
    supabase.from('egresados').select('*').eq('publicado', true).order('orden').limit(10),
    supabase.from('testimonios').select('*').eq('publicado', true).order('orden').limit(6),
    supabase.from('faq').select('id, pregunta, respuesta').eq('publicado', true).order('orden'),
  ])

  const waCurso = `https://wa.me/${sitio.contacto.whatsapp}?text=${encodeURIComponent('Hola, quiero info de los cursos de Recovery Parts')}`

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-grow pt-20">
        {/* Hero */}
        <section className="relative w-full min-h-[80vh] flex items-center justify-center border-b border-outline-variant overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sitio.hero.imagen_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/75 to-surface/40" />
          <div className="absolute inset-0 bg-surface/15" />
          <div className="absolute -top-1/3 right-0 h-[600px] w-[600px] rounded-full bg-accent/20 blur-[140px] pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-surface to-transparent" />
          <div className="absolute inset-0" style={gridBg} />
          <CircuitBoard size={420} strokeWidth={0.5} className="absolute text-primary opacity-[0.06] pointer-events-none" />
          <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 md:px-12 flex flex-col items-center text-center py-20 md:py-24">
            <div className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-low px-3 py-1 rounded mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-on-surface-variant uppercase tracking-widest">Inscripciones Abiertas</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-on-surface max-w-4xl mb-6 tracking-tight leading-[1.1]">{sitio.hero.titulo}</h1>
            <p className="text-lg text-on-surface-variant max-w-xl mb-10 leading-relaxed">{sitio.hero.subtitulo}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/cursos" className="bg-accent text-white font-bold uppercase tracking-widest px-8 py-4 rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2 group">
                Ver Cursos <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href={waCurso} target="_blank" rel="noopener noreferrer" className="border border-outline-variant text-on-surface font-bold uppercase tracking-widest px-8 py-4 rounded hover:border-secondary hover:text-secondary transition-colors flex items-center justify-center gap-2">
                <WhatsAppIcon size={18} /> Reservar lugar
              </a>
            </div>
          </div>
        </section>

        {/* Áreas */}
        <section className="w-full py-14 md:py-20 border-b border-outline-variant bg-surface-container">
          <div className="max-w-[1280px] mx-auto px-4 md:px-12 grid sm:grid-cols-2 gap-6">
            {[
              { icon: Cpu, ...sitio.areas.tecnico },
              { icon: Palette, ...sitio.areas.diseno },
            ].map(({ icon: Icon, titulo, descripcion }) => (
              <div key={titulo} className="bg-surface-container-low border border-outline-variant rounded-lg p-8">
                <Icon size={32} className="text-accent mb-4" />
                <h3 className="text-xl font-semibold text-on-surface mb-2">{titulo}</h3>
                <p className="text-on-surface-variant">{descripcion}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Capacitaciones Destacadas */}
        {!!destacados?.length && (
          <section id="capacitaciones" className="w-full py-14 md:py-20 border-b border-outline-variant bg-surface">
            <div className="max-w-[1280px] mx-auto px-4 md:px-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                <div>
                  <h2 className="text-3xl font-semibold text-on-surface mb-2">Capacitaciones Destacadas</h2>
                  <p className="text-on-surface-variant">Especializaciones de alta demanda técnica.</p>
                </div>
                <Link href="/cursos" className="text-sm font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-wider">
                  Ver catálogo completo <ChevronRight size={16} />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {destacados.map((c) => (
                  <Link key={c.id} href={`/cursos/${c.slug}`} className="group bg-surface-container-low border border-outline-variant rounded overflow-hidden transition-all duration-300 hover:border-secondary flex flex-col">
                    <div className="h-56 border-b border-outline-variant bg-surface relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.imagenes?.[0] && <img src={c.imagenes[0]} alt={c.titulo} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                    </div>
                    <div className="p-6 flex-grow flex flex-col">
                      <div className="flex gap-2 mb-4">
                        <span className="px-2 py-1 rounded text-xs border border-outline-variant text-on-surface-variant bg-surface">{c.tipo === 'taller' ? 'Taller' : 'Curso'}</span>
                        <span className="px-2 py-1 rounded text-xs border border-accent/40 text-accent bg-accent/10">{c.duracion_semanas} semanas</span>
                      </div>
                      <h3 className="text-xl font-semibold text-on-surface mb-2">{c.titulo}</h3>
                      <p className="text-on-surface-variant mb-6 flex-grow line-clamp-3">{c.descripcion}</p>
                      <div className="pt-4 border-t border-outline-variant flex justify-end items-center mt-auto">
                        <ArrowUpRight size={20} className="text-secondary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Construyendo Profesionales */}
        {!!egresados?.length && (
          <section id="egresados" className="w-full py-14 md:py-20 bg-surface-container border-b border-outline-variant">
            <div className="max-w-[1280px] mx-auto px-4 md:px-12">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-semibold text-on-surface mb-4">Construyendo Profesionales</h2>
                <p className="text-on-surface-variant max-w-2xl mx-auto">Cada camada se gradúa con su grupo. Estas son algunas de las últimas promociones de egresados.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[160px] md:auto-rows-[190px] gap-4">
                {egresados.map((e) => (
                  <div key={e.id} className={`relative overflow-hidden rounded border border-outline-variant bg-surface group ${e.destacado ? 'md:col-span-2 md:row-span-2' : ''}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.foto_url} alt={`${e.nombre} — ${e.especialidad}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 bg-gradient-to-t from-black/85 to-transparent">
                      <div className="text-xs md:text-sm font-semibold text-white">{e.nombre} · {e.especialidad}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-14">
                <a href={waCurso} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-accent text-white font-bold uppercase tracking-widest px-8 py-4 rounded hover:opacity-90 transition-opacity group">
                  Quiero inscribirme <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Testimonios */}
        {!!testimonios?.length && (
          <section className="w-full py-14 md:py-20 border-b border-outline-variant bg-surface">
            <div className="max-w-[1280px] mx-auto px-4 md:px-12">
              <h2 className="text-3xl font-semibold text-on-surface mb-12 text-center">Lo que dicen nuestros alumnos</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonios.map((t) => (
                  <div key={t.id} className="bg-surface-container-low border border-outline-variant rounded-lg p-6">
                    <p className="text-on-surface-variant mb-4">&ldquo;{t.comentario}&rdquo;</p>
                    <p className="font-semibold text-on-surface">{t.nombre}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        {!!faqs?.length && (
          <section className="w-full py-14 md:py-20 border-b border-outline-variant bg-surface-container">
            <div className="max-w-[1280px] mx-auto px-4 md:px-12">
              <h2 className="text-3xl font-semibold text-on-surface mb-12 text-center">Preguntas frecuentes</h2>
              <FaqAccordion items={faqs} />
            </div>
          </section>
        )}

        {/* Contacto */}
        <section id="contacto" className="w-full py-14 md:py-20 bg-surface">
          <div className="max-w-[1280px] mx-auto px-4 md:px-12 grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-semibold text-on-surface mb-4">¿Tenés dudas?</h2>
              <p className="text-on-surface-variant mb-6 max-w-md">Dejanos tu consulta y te contactamos, o escribinos directo por WhatsApp.</p>
              <a href={waCurso} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-outline-variant text-on-surface font-bold uppercase tracking-widest px-6 py-3 rounded hover:border-secondary hover:text-secondary transition-colors">
                <WhatsAppIcon size={18} /> Escribinos por WhatsApp
              </a>
            </div>
            <div className="max-w-md w-full md:ml-auto">
              <ContactoForm />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
