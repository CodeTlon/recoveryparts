import { requireRole, fechaAR } from '@/lib/auth'
import { Badge, Empty, PageHead } from '@/components/campus/ui'
import { marcarContactoLeido } from '../actions'

export default async function Consultas() {
  const { sb } = await requireRole('admin')
  const { data } = await sb.from('contactos').select('*').order('creado_en', { ascending: false }).limit(200)
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
              <form action={marcarContactoLeido} className="mt-3">
                <input type="hidden" name="id" value={c.id} /><input type="hidden" name="leido" value={c.leido ? '0' : '1'} />
                <button className="btn-ghost !px-3 !py-2">{c.leido ? 'Marcar como no leída' : 'Marcar como leída'}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
