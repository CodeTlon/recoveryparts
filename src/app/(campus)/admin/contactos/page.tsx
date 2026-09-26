import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { marcarContactoLeidoAction } from '@/lib/actions/cms'

export default async function AdminContactosPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: contactos } = await supabase.from('contactos').select('*').order('created_at', { ascending: false })

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">Consultas</h1>
        <p className="text-lg text-on-surface-variant">Mensajes recibidos desde el formulario de contacto del sitio.</p>
      </header>

      <section className="space-y-3">
        {(contactos ?? []).map((c) => (
          <div key={c.id} className={`bg-surface-container-low border rounded-lg p-5 ${c.leido ? 'border-outline-variant' : 'border-accent'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-semibold text-on-surface">{c.nombre} <span className="text-on-surface-variant font-normal">· {c.email}</span></p>
                {c.telefono && <p className="text-sm text-on-surface-variant">{c.telefono}</p>}
              </div>
              <form action={marcarContactoLeidoAction.bind(null, c.id, !c.leido)}>
                <button type="submit" className={`text-xs font-semibold px-3 py-1.5 rounded ${c.leido ? 'bg-surface-container-high text-on-surface-variant' : 'bg-accent text-white'}`}>
                  {c.leido ? 'Leído' : 'Marcar leído'}
                </button>
              </form>
            </div>
            <p className="text-sm text-on-surface-variant whitespace-pre-wrap">{c.mensaje}</p>
            <p className="text-xs text-on-surface-variant mt-3">{new Date(c.created_at).toLocaleString('es-AR')}</p>
          </div>
        ))}
        {!contactos?.length && <p className="text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg p-6">Todavía no hay consultas.</p>}
      </section>
    </>
  )
}
