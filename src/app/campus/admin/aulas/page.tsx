import Reveal from '@/components/ui/Reveal'
import { requireRole } from '@/lib/auth'
import { ArchiveRestore, ArchiveX, DoorOpen, Pencil, Plus } from 'lucide-react'
import { ActionForm, Badge, Empty, Field, ModalButton, PageHead } from '@/components/campus/ui'
import { guardarAula, setEstadoAula } from '../actions'

type Aula = { id: string; nombre: string; capacidad: number | null; activa: boolean; cursos: { id: string; nombre: string; cupo: number; activo: boolean }[] }

// RF-03: catálogo de aulas. La capacidad es el techo físico; el cupo de cada curso no la supera (lo valida la base).
export default async function Aulas() {
  const { sb } = await requireRole('admin')
  const { data } = await sb.from('aulas').select('id, nombre, capacidad, activa, cursos(id, nombre, cupo, activo)').order('activa', { ascending: false }).order('nombre')
  const aulas = (data ?? []) as Aula[]

  return (
    <>
      <PageHead title="Aulas" sub="La capacidad es la cantidad máxima de personas que entran en el aula. El cupo de cada curso nunca puede superarla."
        action={
          <ModalButton label={<><Plus size={16} aria-hidden /> Crear aula</>} title="Crear aula" className="btn-primary whitespace-nowrap">
            <ActionForm action={guardarAula} submit="Crear aula">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre" name="nombre" placeholder="Ej: Aula 4" required />
                <Field label="Capacidad (personas)" name="capacidad" placeholder="Ej: 12" type="number" min={1} max={500} required hint="Bancos o puestos de trabajo disponibles." />
              </div>
            </ActionForm>
          </ModalButton>
        } />

      {!aulas.length ? <Empty>Todavía no hay aulas cargadas.</Empty> : (
        <ul className="space-y-3">
          {aulas.map((a) => {
            const activos = a.cursos.filter((c) => c.activo)
            return (
              <Reveal key={a.id} y={8}>
                <li className={`card p-4 transition-colors hover:border-outline ${a.activa ? '' : 'opacity-70'}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-container-high text-secondary"><DoorOpen size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{a.nombre}</p>
                      <p className="text-sm text-on-surface-variant">
                        {activos.length ? `${activos.length} curso${activos.length === 1 ? '' : 's'} activo${activos.length === 1 ? '' : 's'}` : 'Sin cursos activos'}
                      </p>
                    </div>
                    {a.capacidad != null ? <Badge>{a.capacidad} personas</Badge> : <Badge tone="warn">Cargá la capacidad</Badge>}
                    <Badge tone={a.activa ? 'ok' : 'bad'}>{a.activa ? 'Activa' : 'Dada de baja'}</Badge>
                    <div className="flex flex-wrap items-center gap-2">
                      <ModalButton label={<><Pencil size={14} aria-hidden /> Editar</>} title={`Editar ${a.nombre}`}>
                        <ActionForm action={guardarAula} reset={false} submit="Guardar cambios">
                          <input type="hidden" name="id" value={a.id} />
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Nombre" name="nombre" placeholder="Ej: Aula 4" defaultValue={a.nombre} required />
                            <Field label="Capacidad (personas)" name="capacidad" placeholder="Ej: 12" type="number" min={1} max={500} defaultValue={a.capacidad} required={a.capacidad != null}
                              hint={activos.length ? `No puede ser menor que el cupo más alto de sus cursos activos (${Math.max(...activos.map((c) => c.cupo))}).` : 'Bancos o puestos de trabajo disponibles.'} />
                          </div>
                        </ActionForm>
                      </ModalButton>
                      {a.activa ? (
                        <ModalButton label={<><ArchiveX size={14} aria-hidden /> Dar de baja</>} title={`Dar de baja ${a.nombre}`} className="btn-ghost !px-3 !py-2 hover:!border-red-400 hover:!text-red-300">
                          <ActionForm action={setEstadoAula} submit="Dar de baja">
                            <input type="hidden" name="id" value={a.id} /><input type="hidden" name="activa" value="0" />
                            <p className="text-sm text-on-surface-variant">
                              {activos.length
                                ? `No se puede dar de baja mientras la usen cursos activos (${activos.map((c) => c.nombre).join(', ')}). Cambiales el aula o dalos de baja primero.`
                                : 'Deja de aparecer para elegir en los cursos. Los cursos que ya la tenían conservan el dato. Podés reactivarla cuando quieras.'}
                            </p>
                          </ActionForm>
                        </ModalButton>
                      ) : (
                        <ModalButton label={<><ArchiveRestore size={14} aria-hidden /> Reactivar</>} title={`Reactivar ${a.nombre}`} className="btn-ghost !px-3 !py-2 hover:!border-green-400 hover:!text-green-300">
                          <ActionForm action={setEstadoAula} submit="Reactivar">
                            <input type="hidden" name="id" value={a.id} /><input type="hidden" name="activa" value="1" />
                            <p className="text-sm text-on-surface-variant">Vuelve a aparecer para elegir en los cursos.</p>
                          </ActionForm>
                        </ModalButton>
                      )}
                    </div>
                  </div>
                  {activos.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5 sm:pl-[3.25rem]" aria-label={`Cursos activos en ${a.nombre}`}>
                      {activos.map((c) => <li key={c.id} className="rounded-full border border-outline-variant px-2.5 py-0.5 text-xs text-on-surface-variant">{c.nombre} · cupo {c.cupo}</li>)}
                    </ul>
                  )}
                </li>
              </Reveal>
            )
          })}
        </ul>
      )}
    </>
  )
}
