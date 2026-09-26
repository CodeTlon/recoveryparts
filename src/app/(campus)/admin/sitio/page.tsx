import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { CmsSitioForm, type SitioConfig } from '@/components/campus/CmsSitioForm'

export default async function AdminSitioPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data } = await supabase.from('sitio_config').select('*').eq('id', 1).maybeSingle()
  const config = (data ?? { hero: {}, areas: {}, stats: {}, contacto: {} }) as unknown as SitioConfig

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">Sitio público</h1>
        <p className="text-lg text-on-surface-variant">Textos e imágenes editables de la Home.</p>
      </header>
      <div className="max-w-3xl">
        <CmsSitioForm config={config} />
      </div>
    </>
  )
}
