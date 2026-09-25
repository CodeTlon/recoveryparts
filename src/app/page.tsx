// ============================================================
// DEMO — Home (Recovery Parts)
// Fiel al diseño Stitch "home_recovery_parts" (Industrial
// Technical Narrative): hero a pantalla, Capacitaciones Destacadas
// (3 cards) y Construyendo Profesionales (grid). Mock estático.
// Fotos reales (flyers) desde /public/images.
// ============================================================

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight, ChevronRight, CircuitBoard } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'
import WhatsAppButton from '@/components/layout/WhatsAppButton'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import { WhatsAppIcon } from '@/components/layout/SocialIcons'

const gridBg: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, rgba(143,144,151,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(143,144,151,0.05) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
}

const CURSOS = [
  { img: '/images/curso-iphone.jpg', mod: 'MOD-IP01', tags: ['4 Meses', 'Presencial'], title: 'Reparación de iPhone', desc: 'Diagnóstico avanzado, micro-soldadura y reemplazo de componentes a nivel placa.', foot: 'Próximo inicio: 15 Oct', href: '/cursos' },
  { img: '/images/curso-notebooks.jpg', mod: 'MOD-NB02', tags: ['6 Meses', 'Híbrido'], title: 'Hardware de Notebooks', desc: 'Análisis esquemático, reballing y reparación integral de equipos portátiles multimarca.', foot: 'Próximo inicio: 02 Nov', href: '/cursos' },
  { img: '/images/curso-neon.jpg', mod: 'MOD-NL03', tags: ['2 Meses', 'Presencial'], title: 'Cartelería Neón LED', desc: 'Diseño, ruteo y ensamblaje de sistemas de iluminación LED personalizados y comerciales.', foot: 'Cupos limitados', href: '/cursos' },
]

export default function Home() {
  const waCurso = `https://wa.me/${demoConfig.business.whatsapp}?text=${encodeURIComponent('Hola, quiero info de los cursos de Recovery Parts')}`

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-grow pt-20">
        {/* Hero */}
        <section className="relative w-full min-h-[80vh] flex items-center justify-center border-b border-outline-variant overflow-hidden">
          <Image src="/images/hero.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
          {/* Overlays: dejan ver la foto (antes la tapaban casi por completo) */}
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/75 to-surface/40" />
          <div className="absolute inset-0 bg-surface/15" />
          {/* Glow naranja para dar profundidad/calidez al hero */}
          <div className="absolute -top-1/3 right-0 h-[600px] w-[600px] rounded-full bg-accent/20 blur-[140px] pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-surface to-transparent" />
          <div className="absolute inset-0" style={gridBg} />
          <CircuitBoard size={420} strokeWidth={0.5} className="absolute text-primary opacity-[0.06] pointer-events-none" />
          <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 md:px-12 flex flex-col items-center text-center py-20 md:py-24">
            <div className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-low px-3 py-1 rounded mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-on-surface-variant uppercase tracking-widest">Inscripciones Abiertas</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-on-surface max-w-4xl mb-6 tracking-tight leading-[1.1]">
              Dominá la tecnología en el <br className="hidden md:block" /> corazón de Córdoba
            </h1>
            <p className="text-lg text-on-surface-variant max-w-xl mb-10 leading-relaxed">
              Formación técnica 100% práctica en reparación y microelectrónica.
            </p>
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

        {/* Capacitaciones Destacadas */}
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
              {CURSOS.map(({ img, mod, tags, title, desc, foot, href }) => (
                <Link key={mod} href={href} className="group bg-surface-container-low border border-outline-variant rounded overflow-hidden transition-all duration-300 hover:border-secondary flex flex-col">
                  <div className="h-56 border-b border-outline-variant bg-surface relative overflow-hidden">
                    <Image src={img} alt={title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <div className="flex gap-2 mb-4">
                      {tags.map((t, i) => (
                        <span key={t} className={`px-2 py-1 rounded text-xs border ${i === 1 ? 'border-accent/40 text-accent bg-accent/10' : 'border-outline-variant text-on-surface-variant bg-surface'}`}>{t}</span>
                      ))}
                    </div>
                    <h3 className="text-xl font-semibold text-on-surface mb-2">{title}</h3>
                    <p className="text-on-surface-variant mb-6 flex-grow">{desc}</p>
                    <div className="pt-4 border-t border-outline-variant flex justify-between items-center mt-auto">
                      <span className="text-sm font-semibold text-on-surface">{foot}</span>
                      <ArrowUpRight size={20} className="text-secondary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Construyendo Profesionales */}
        <section id="egresados" className="w-full py-14 md:py-20 bg-surface-container border-b border-outline-variant">
          <div className="max-w-[1280px] mx-auto px-4 md:px-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold text-on-surface mb-4">Construyendo Profesionales</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">Cada camada se gradúa con su grupo. Estas son algunas de las últimas promociones de egresados.</p>
            </div>
            {/* ponytail: bento que tesela exacto (2 destacadas 2x2 + 8 simples = 4×4, sin huecos) */}
            <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[160px] md:auto-rows-[190px] gap-4">
              {[
                { n: 1,  tag: 'Reparación de iPhone',  fecha: '05/06/2026', big: true },
                { n: 5,  tag: 'Reparación de Notebooks', fecha: '18/05/2026' },
                { n: 3,  tag: 'Reparación de PC',      fecha: '02/05/2026' },
                { n: 4,  tag: 'Carteles Neón LED',     fecha: '20/04/2026' },
                { n: 2,  tag: 'Reparación de Android', fecha: '10/04/2026' },
                { n: 6,  tag: 'Microsoldadura',        fecha: '22/03/2026' },
                { n: 7,  tag: 'Cambio de Glass',       fecha: '08/03/2026' },
                { n: 8,  tag: 'Reparación de TV',      fecha: '28/02/2026', big: true },
                { n: 9,  tag: 'Estampado',             fecha: '10/02/2026' },
                { n: 10, tag: 'Reparación de iPhone',  fecha: '31/01/2026' },
              ].map((e) => (
                <div key={e.n} className={`relative overflow-hidden rounded border border-outline-variant bg-surface group ${e.big ? 'md:col-span-2 md:row-span-2' : ''}`}>
                  <Image src={`/images/egresado-${e.n}.jpg`} alt={`Egresados ${e.tag} — Recovery Parts (${e.fecha})`} fill sizes={e.big ? '(max-width: 768px) 50vw, 50vw' : '(max-width: 768px) 50vw, 25vw'} className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 bg-gradient-to-t from-black/85 to-transparent">
                    <div className="text-xs md:text-sm font-semibold text-white">Egresados {e.tag} · {e.fecha}</div>
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
      </main>

      <SiteFooter />

      <WhatsAppButton />
    </div>
  )
}
