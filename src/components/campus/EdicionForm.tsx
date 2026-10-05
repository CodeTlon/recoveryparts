'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionForm, Field, Select } from './forms'
import { guardarEdicion, type R } from '@/app/campus/admin/actions'

type Edicion = { id: string; fecha_inicio: string | null; aula_id: string | null; profesor_id: string | null; cupo: number }
type Aula = { id: string; nombre: string; capacidad: number | null; activa?: boolean }

// Datos de una edición: fecha de inicio, aula, profesor y cupo. La base vuelve a validar todo
// (cupo 1–500 y ≤ capacidad del aula, una edición por vez del curso, choques de aula/profesor).
export default function EdicionForm({ cursoId, edicion, aulas, profesores }: { cursoId: string; edicion?: Edicion; aulas: Aula[]; profesores: [string, string][] }) {
  const router = useRouter()
  // RF-03: el cupo no puede superar la capacidad del aula; acá se sugiere y se limita en el input.
  const capacidad = (id?: string | null) => aulas.find((a) => a.id === id)?.capacidad ?? null
  const [maxAula, setMaxAula] = useState(() => capacidad(edicion?.aula_id))
  const aulaOpts: [string, string][] = aulas.map((a) => [a.id, `${a.nombre}${a.capacidad != null ? ` · ${a.capacidad} lugares` : ''}${a.activa === false ? ' (dada de baja)' : ''}`])
  // Al elegir un aula: si el cupo está vacío, se completa con la capacidad (el admin lo baja si quiere).
  const onAula = (e: React.FormEvent<HTMLDivElement>) => {
    const t = e.target as HTMLSelectElement
    if (t.name !== 'aula_id') return
    const cap = capacidad(t.value)
    setMaxAula(cap)
    const cupo = t.form?.elements.namedItem('cupo') as HTMLInputElement | null
    if (cupo && !cupo.value && cap != null) cupo.value = String(cap)
  }
  // Una edición nueva pasa a su página, directo a Horarios (después Calendario).
  const onSuccess = (s: R & { id?: string }) => { if (s.id && !edicion) router.replace(`/campus/admin/cursos/${cursoId}/ediciones/${s.id}?tab=horarios`) }
  return (
    <ActionForm<R & { id?: string }> action={guardarEdicion} submit={edicion ? 'Guardar cambios' : 'Crear edición'} reset={false} onSuccess={onSuccess} className="card p-6">
      <input type="hidden" name="curso_id" value={cursoId} />
      {edicion && <input type="hidden" name="id" value={edicion.id} />}
      <div className="grid gap-4 sm:grid-cols-2" onChange={onAula}>
        <Field label="Fecha de inicio" name="fecha_inicio" type="date" defaultValue={edicion?.fecha_inicio} required hint="No puede superponerse con otra edición activa de este curso." />
        <Select name="aula_id" label="Aula" defaultValue={edicion?.aula_id} empty="Sin asignar" options={aulaOpts} />
        <Select name="profesor_id" label="Profesor (uno solo)" defaultValue={edicion?.profesor_id} empty="Sin asignar" options={profesores} />
        <Field label="Cupo máximo" name="cupo" placeholder="Ej: 12" type="number" min={1} max={maxAula ?? 500} defaultValue={edicion?.cupo} required
          hint={`No puede ser menor que los alumnos ya asignados.${maxAula != null ? ` Máximo del aula: ${maxAula}.` : ''}`} />
      </div>
    </ActionForm>
  )
}
