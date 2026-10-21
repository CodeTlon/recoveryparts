import { ActionForm } from '@/components/campus/ui'
import { enviarAvisosPendientes } from '@/app/campus/admin/actions'

// Clases suspendidas o reprogramadas cuyo aviso por mail todavía no salió (no se tildó «avisar ahora» o algún mail falló).
export default function AvisosPendientes({ edicionId, cantidad }: { edicionId: string; cantidad: number }) {
  if (cantidad <= 0) return null
  return (
    <div role="status" className="mb-4 max-w-4xl rounded-sm border border-warning/50 bg-warning/10 p-4">
      <p className="text-sm font-semibold text-warning">
        {cantidad === 1 ? 'Hay 1 clase suspendida o reprogramada' : `Hay ${cantidad} clases suspendidas o reprogramadas`} sin avisar a los alumnos.
      </p>
      <ActionForm action={enviarAvisosPendientes} submit="Enviar avisos pendientes" reset={false} okLabel="Avisos enviados" className="mt-3">
        <input type="hidden" name="edicion_id" value={edicionId} />
      </ActionForm>
    </div>
  )
}
