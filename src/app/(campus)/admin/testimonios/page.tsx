import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { CmsTestimonioForm } from '@/components/campus/CmsTestimonioForm'
import { eliminarTestimonioAction } from '@/lib/actions/cms'
import { PublicadoToggle, DeleteButton } from '@/components/campus/CmsRowActions'

export default async function AdminTestimoniosPage() {
  await requireAdmin()
  const supabase = await createClient()
  const [{ data: testimonios }, { data: cursos }] = await Promise.all([
    supabase.from('testimonios').select('id, nombre, comentario, puntaje, publicado').order('orden'),
    supabase.from('cursos').select('id, titulo').order('titulo'),
  ])

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">Testimonios</h1>
        <p className="text-lg text-on-surface-variant">Opiniones de alumnos para la Home y las fichas de curso.</p>
      </header>

      <section className="mb-12"><CmsTestimonioForm cursos={cursos ?? []} /></section>

      <section className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
              <th className="font-semibold px-4 py-3">Nombre</th>
              <th className="font-semibold px-4 py-3">Comentario</th>
              <th className="font-semibold px-4 py-3">Puntaje</th>
              <th className="font-semibold px-4 py-3"></th>
              <th className="font-semibold px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(testimonios ?? []).map((t) => (
              <tr key={t.id} className="border-t border-outline-variant text-on-surface">
                <td className="px-4 py-3 font-medium">{t.nombre}</td>
                <td className="px-4 py-3 text-on-surface-variant max-w-sm truncate">{t.comentario}</td>
                <td className="px-4 py-3 text-on-surface-variant">{t.puntaje} ⭐</td>
                <td className="px-4 py-3"><PublicadoToggle tabla="testimonios" id={t.id} publicado={t.publicado} /></td>
                <td className="px-4 py-3"><DeleteButton action={eliminarTestimonioAction.bind(null, t.id)} /></td>
              </tr>
            ))}
            {!testimonios?.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant">Todavía no hay testimonios.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  )
}
