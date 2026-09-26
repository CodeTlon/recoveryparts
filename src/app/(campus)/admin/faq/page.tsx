import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { CmsFaqForm } from '@/components/campus/CmsFaqForm'
import { eliminarFaqAction } from '@/lib/actions/cms'
import { PublicadoToggle, DeleteButton } from '@/components/campus/CmsRowActions'

export default async function AdminFaqPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: faqs } = await supabase.from('faq').select('*').order('orden')

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">Preguntas frecuentes</h1>
        <p className="text-lg text-on-surface-variant">FAQ del sitio público.</p>
      </header>

      <section className="mb-12"><CmsFaqForm /></section>

      <section className="space-y-3">
        {(faqs ?? []).map((f) => (
          <div key={f.id} className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-on-surface">{f.pregunta}</p>
              <p className="text-sm text-on-surface-variant mt-1">{f.respuesta}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PublicadoToggle tabla="faq" id={f.id} publicado={f.publicado} />
              <DeleteButton action={eliminarFaqAction.bind(null, f.id)} />
            </div>
          </div>
        ))}
        {!faqs?.length && <p className="text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg p-6">Todavía no hay preguntas.</p>}
      </section>
    </>
  )
}
