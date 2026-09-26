import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { CmsFotoForm } from '@/components/campus/CmsFotoForm'
import { eliminarFotoGaleriaAction } from '@/lib/actions/cms'
import { PublicadoToggle, DeleteButton } from '@/components/campus/CmsRowActions'

const CATEGORIA_LABEL: Record<string, string> = {
  aulas: 'Aulas', clases: 'Clases en acción', trabajos_alumnos: 'Trabajos de alumnos', egresados: 'Egresados', eventos: 'Eventos',
}

export default async function AdminGaleriaPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: fotos } = await supabase.from('galeria_fotos').select('*').order('categoria').order('orden')

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">Galería</h1>
        <p className="text-lg text-on-surface-variant">Fotos de aulas, clases, trabajos de alumnos, egresados y eventos.</p>
      </header>

      <section className="mb-12">
        <CmsFotoForm />
      </section>

      <section className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
              <th className="font-semibold px-4 py-3">Imagen</th>
              <th className="font-semibold px-4 py-3">Categoría</th>
              <th className="font-semibold px-4 py-3">Alt</th>
              <th className="font-semibold px-4 py-3"></th>
              <th className="font-semibold px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(fotos ?? []).map((f) => (
              <tr key={f.id} className="border-t border-outline-variant text-on-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <td className="px-4 py-3"><img src={f.url} alt="" className="w-16 h-12 object-cover rounded" /></td>
                <td className="px-4 py-3 text-on-surface-variant">{CATEGORIA_LABEL[f.categoria] ?? f.categoria}</td>
                <td className="px-4 py-3 text-on-surface-variant max-w-xs truncate">{f.alt}</td>
                <td className="px-4 py-3"><PublicadoToggle tabla="galeria_fotos" id={f.id} publicado={f.publicado} /></td>
                <td className="px-4 py-3"><DeleteButton action={eliminarFotoGaleriaAction.bind(null, f.id)} /></td>
              </tr>
            ))}
            {!fotos?.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant">Todavía no hay fotos.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  )
}
