import { requireRole, fechaAR } from '@/lib/auth'
import Paginacion, { corregirPagina, paginaDe, rango } from '@/components/campus/Paginacion'
import { ActionForm, Badge, Empty, PageHead, SubmitButton } from '@/components/campus/ui'
import { marcarContactoLeido } from '../actions'

export default async function Consultas({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const pagina = paginaDe((await searchParams).pagina)
  const { sb } = await requireRole('admin')
  // Antes: las 200 más nuevas y el resto inalcanzable. Ahora todas, de a POR_PAGINA.
  const { data, count } = await sb.from('contactos').select('*', { count: 'exact' }).order('creado_en', { ascending: false }).order('id').range(...rango(pagina))
  corregirPagina(pagina, count ?? 0)
  return (
    <>
      <PageHead title="Consultas" sub="Mensajes enviados desde el formulario de contacto del sitio." />
      {!data?.length ? <Empty>No hay consultas.</Empty> : (
        <ul className="space-y-3">
          {data.map((c) => (
            <li key={c.id} className={`card p-5 ${c.leido ? '' : 'border-l-4 border-l-accent'}`}>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <p className="font-semibold">{c.nombre}</p>
                <a href={`mailto:${c.email}`} className="text-sm text-secondary">{c.email}</a>
                {c.telefono && <span className="text-sm text-on-surface-variant">{c.telefono}</span>}
                <span className="ml-auto text-xs text-on-surface-variant">{fechaAR(c.creado_en)}</span>
                {!c.leido && <Badge tone="warn">Nueva</Badge>}
              </div>
              <p className="whitespace-pre-line text-sm text-on-surface-variant">{c.mensaje}</p>
              <ActionForm action={marcarContactoLeido} submit={null} reset={false} okLabel="Hecho" className="mt-3">
                <input type="hidden" name="id" value={c.id} /><input type="hidden" name="leido" value={c.leido ? '0' : '1'} />
                <SubmitButton>{c.leido ? 'Marcar como no leída' : 'Marcar como leída'}</SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
      <Paginacion pagina={pagina} total={count ?? 0} que="consultas" />
    </>
  )
}
