import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Zap, Clock, Award, Wrench, ArrowRight, Headset, ExternalLink, Star } from 'lucide-react'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import { createClient } from '@/lib/supabase/server'
import { getSitioConfig } from '@/lib/sitio'
import { TemarioAcordeon } from '@/components/public/TemarioAcordeon'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const fmtPrecio = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

async function getCurso(slug: string) {
  const supabase = await createClient()
  const { data: curso } = await supabase.from('cursos').select('*').eq('slug', slug).eq('publicado', true).maybeSingle()
  return curso
}

export async function generateStaticParams() {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('cursos').select('slug').eq('publicado', true)
    return (data ?? []).map((c) => ({ slug: c.slug }))
  } catch {
    return [] // build sin credenciales de Supabase (Bug 24 de la fábrica) — se resuelve on-demand
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const curso = await getCurso(slug)
  if (!curso) return {}
  return { title: `${curso.titulo} — Recovery Parts`, description: curso.descripcion.slice(0, 160) }
}

export default async function CursoDetallePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const curso = await getCurso(slug)
  if (!curso) notFound()

  const supabase = await createClient()
  const [{ data: profesor }, { data: testimonios }, { count: inscriptos }, sitio] = await Promise.all([
    curso.profesor_id
      ? supabase.from('profiles').select('nombre, apellido, bio, foto_url').eq('id', curso.profesor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('testimonios').select('nombre, puntaje, comentario, foto_url').eq('publicado', true).or(`curso_id.eq.${curso.id},curso_id.is.null`).order('orden'),
    supabase.from('matriculas').select('*', { count: 'exact', head: true }).eq('curso_id', curso.id).eq('estado', 'activo'),
    getSitioConfig(),
  ])

  const disponibles = curso.cupo_total - (inscriptos ?? 0)
  const precio = curso.precio_descuento ?? curso.precio
  const wa = `https://wa.me/${sitio.contacto.whatsapp}?text=${encodeURIComponent(`Hola, quiero info del curso de ${curso.titulo}`)}`
  const kit: { nombre: string; descripcion: string; precio: number; link: string }[] = curso.kit_items ?? []
  const temario: { titulo: string; descripcion: string }[] = curso.temario ?? []

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <SiteNav />
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 md:px-12 pt-28 pb-12 md:pb-20">
        {/* Hero */}
        <section className="mb-16 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="bg-surface-container-high border border-outline/30 px-3 py-1 rounded text-primary text-xs font-medium uppercase tracking-wider">
                {curso.tipo === 'taller' ? 'Taller' : 'Curso'} · {curso.area === 'diseno' ? 'Diseño' : 'Técnico'}
              </span>
              {disponibles > 0 && disponibles <= 3 && (
                <span className="border border-secondary px-3 py-1 rounded text-secondary text-xs font-medium uppercase tracking-wider flex items-center gap-1 bg-secondary/10">
                  <Zap size={14} /> Cupos Limitados
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-on-surface">{curso.titulo}</h1>
            <p className="text-lg text-on-surface-variant max-w-2xl border-l-2 border-outline pl-4 leading-relaxed">{curso.descripcion}</p>
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center gap-2 bg-surface-container px-4 py-2 border border-outline/20 rounded text-sm font-semibold">
                <Clock size={18} className="text-primary" /> {curso.duracion_semanas} semanas
              </div>
              <div className="flex items-center gap-2 bg-surface-container px-4 py-2 border border-outline/20 rounded text-sm font-semibold">
                <Award size={18} className="text-primary" /> {curso.dias_semana.map((d: number) => DIAS[d]).join('/')} {curso.hora_inicio.slice(0, 5)}–{curso.hora_fin.slice(0, 5)}
              </div>
              <div className="flex items-center gap-2 bg-surface-container px-4 py-2 border border-outline/20 rounded text-sm font-semibold">
                <Wrench size={18} className="text-primary" /> Aula {curso.aula}
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 relative h-64 lg:h-[400px] border border-outline/30 rounded overflow-hidden">
            {/* img plano: URL de imagen cargada por el Admin, dominio arbitrario */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {curso.imagenes?.[0] && <img src={curso.imagenes[0]} alt={curso.titulo} className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-surface/60 to-transparent" />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 flex flex-col gap-12">
            {/* Requisitos */}
            {curso.requisitos && (
              <section>
                <h2 className="text-2xl font-semibold text-on-surface mb-3">Requisitos previos</h2>
                <p className="text-on-surface-variant">{curso.requisitos}</p>
              </section>
            )}

            {/* Plan de estudios */}
            <section id="plan">
              <h2 className="text-2xl font-semibold text-on-surface mb-4">Plan de Estudios</h2>
              <TemarioAcordeon modulos={temario} />
            </section>

            {/* Profesor */}
            {profesor && (
              <section>
                <h2 className="text-2xl font-semibold text-on-surface mb-4">Tu profesor</h2>
                <div className="flex items-center gap-4 bg-surface-container-low border border-outline-variant rounded-lg p-6">
                  <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant overflow-hidden relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {profesor.foto_url && <img src={profesor.foto_url} alt={`${profesor.nombre} ${profesor.apellido}`} className="absolute inset-0 w-full h-full object-cover" />}
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{profesor.nombre} {profesor.apellido}</p>
                    {profesor.bio && <p className="text-sm text-on-surface-variant mt-1">{profesor.bio}</p>}
                  </div>
                </div>
              </section>
            )}

            {/* Testimonios */}
            {!!testimonios?.length && (
              <section>
                <h2 className="text-2xl font-semibold text-on-surface mb-4">Lo que dicen nuestros alumnos</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {testimonios.map((t, i) => (
                    <div key={i} className="bg-surface-container-low border border-outline-variant rounded-lg p-5">
                      <div className="flex gap-1 mb-2">
                        {Array.from({ length: t.puntaje }).map((_, j) => <Star key={j} size={14} className="fill-accent text-accent" />)}
                      </div>
                      <p className="text-sm text-on-surface-variant mb-3">&ldquo;{t.comentario}&rdquo;</p>
                      <p className="text-sm font-semibold text-on-surface">{t.nombre}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar Inversión */}
          <div className="lg:col-span-4 relative">
            <div className="lg:sticky lg:top-[100px] flex flex-col gap-6">
              <div className="bg-surface-container border border-outline-variant rounded p-6 flex flex-col gap-6 shadow-lg shadow-black/50">
                <div>
                  <h3 className="text-2xl font-semibold text-on-surface">Inversión</h3>
                  <p className="text-xs text-on-surface-variant mt-1 uppercase tracking-wider">Precio de referencia</p>
                </div>
                <div className="flex flex-col gap-1">
                  {curso.precio_descuento && (
                    <span className="text-lg text-on-surface-variant line-through">{fmtPrecio(curso.precio)}</span>
                  )}
                  <span className="text-4xl md:text-5xl font-bold text-on-surface">{fmtPrecio(precio)}</span>
                  <span className="text-xs text-on-surface-variant mt-1">
                    {disponibles > 0 ? `${disponibles} cupos disponibles de ${curso.cupo_total}` : 'Sin cupos disponibles'}
                  </span>
                </div>

                {kit.length > 0 && (
                  <>
                    <div className="h-px w-full bg-outline/20" />
                    <div>
                      <h4 className="text-sm font-semibold text-on-surface mb-3">Kit necesario</h4>
                      <ul className="flex flex-col gap-2">
                        {kit.map((item, i) => (
                          <li key={i} className="flex items-center justify-between gap-2 text-sm">
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-secondary transition-colors flex items-center gap-1">
                              {item.nombre} <ExternalLink size={12} />
                            </a>
                            <span className="text-on-surface font-semibold shrink-0">{fmtPrecio(item.precio)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="mt-2 w-full bg-accent hover:opacity-90 text-white font-bold uppercase tracking-wider py-4 rounded text-center transition-opacity flex justify-center items-center gap-2 group">
                  Consultar por WhatsApp
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              <div className="bg-surface-container-low border border-outline/20 rounded p-4 flex items-start gap-4">
                <Headset size={26} className="text-primary shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">¿Dudas técnicas?</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Hablá con un asesor por WhatsApp para evaluar tu perfil.</p>
                </div>
              </div>

              <Link href="/login" className="text-center text-sm text-on-surface-variant hover:text-secondary transition-colors">
                ← Volver al campus
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
