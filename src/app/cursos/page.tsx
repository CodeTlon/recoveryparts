import type { Metadata } from 'next'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import { createClient } from '@/lib/supabase/server'
import { getSitioConfig } from '@/lib/sitio'
import { CursosCatalogo, type CursoCatalogo } from '@/components/public/CursosCatalogo'

export const metadata: Metadata = {
  title: 'Cursos y Talleres — Recovery Parts',
  description: 'Capacitaciones técnicas en reparación de celulares, computadoras y oficios creativos en Córdoba.',
}

export default async function CursosPage() {
  const sitio = await getSitioConfig()
  const supabase = await createClient()
  const { data: cursos } = await supabase
    .from('cursos')
    .select('id, slug, titulo, descripcion, tipo, area, dias_semana, hora_inicio, hora_fin, precio, precio_descuento, imagenes, cupo_total, destacado, orden_destacado')
    .eq('publicado', true)
    .eq('estado', 'activo')
    .order('destacado', { ascending: false })
    .order('orden_destacado')

  const ids = (cursos ?? []).map((c) => c.id)
  const { data: matriculas } = ids.length
    ? await supabase.from('matriculas').select('curso_id').eq('estado', 'activo').in('curso_id', ids)
    : { data: [] as { curso_id: number }[] }
  const inscriptosPorCurso = new Map<number, number>()
  for (const m of matriculas ?? []) inscriptosPorCurso.set(m.curso_id, (inscriptosPorCurso.get(m.curso_id) ?? 0) + 1)

  const catalogo: CursoCatalogo[] = (cursos ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    titulo: c.titulo,
    descripcion: c.descripcion,
    tipo: c.tipo,
    area: c.area,
    dias_semana: c.dias_semana,
    hora_inicio: c.hora_inicio,
    hora_fin: c.hora_fin,
    precio: c.precio,
    precio_descuento: c.precio_descuento,
    imagenes: c.imagenes ?? [],
    cupoTotal: c.cupo_total,
    inscriptos: inscriptosPorCurso.get(c.id) ?? 0,
  }))

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-grow pt-28 pb-20 w-full max-w-[1280px] mx-auto px-4 md:px-12">
        <header className="mb-10">
          <h1 className="text-3xl md:text-5xl font-bold text-primary mb-3 tracking-tight">Cursos y Talleres</h1>
          <p className="text-lg text-on-surface-variant max-w-2xl">Formación técnica 100% práctica en Córdoba.</p>
        </header>
        <CursosCatalogo cursos={catalogo} whatsapp={sitio.contacto.whatsapp} />
      </main>
      <SiteFooter />
    </div>
  )
}
