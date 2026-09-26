import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { CmsEgresadoForm } from '@/components/campus/CmsEgresadoForm'
import { eliminarEgresadoAction } from '@/lib/actions/cms'
import { PublicadoToggle, DeleteButton } from '@/components/campus/CmsRowActions'

export default async function AdminEgresadosPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: egresados } = await supabase.from('egresados').select('*').order('orden')

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">Egresados</h1>
        <p className="text-lg text-on-surface-variant">Bento &quot;Construyendo Profesionales&quot; de la Home.</p>
      </header>

      <section className="mb-12"><CmsEgresadoForm /></section>

      <section className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
              <th className="font-semibold px-4 py-3">Imagen</th>
              <th className="font-semibold px-4 py-3">Nombre</th>
              <th className="font-semibold px-4 py-3">Especialidad</th>
              <th className="font-semibold px-4 py-3">Destacado</th>
              <th className="font-semibold px-4 py-3"></th>
              <th className="font-semibold px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(egresados ?? []).map((e) => (
              <tr key={e.id} className="border-t border-outline-variant text-on-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <td className="px-4 py-3"><img src={e.foto_url} alt="" className="w-16 h-12 object-cover rounded" /></td>
                <td className="px-4 py-3 font-medium">{e.nombre}</td>
                <td className="px-4 py-3 text-on-surface-variant">{e.especialidad}</td>
                <td className="px-4 py-3 text-on-surface-variant">{e.destacado ? 'Sí' : '—'}</td>
                <td className="px-4 py-3"><PublicadoToggle tabla="egresados" id={e.id} publicado={e.publicado} /></td>
                <td className="px-4 py-3"><DeleteButton action={eliminarEgresadoAction.bind(null, e.id)} /></td>
              </tr>
            ))}
            {!egresados?.length && <tr><td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant">Todavía no hay egresados cargados.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  )
}
