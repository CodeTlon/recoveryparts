'use client'

import { useRouter } from 'next/navigation'
import { ActionForm, Field } from './forms'
import { duplicarEdicion, type R } from '@/app/campus/admin/actions'

// Duplicar una edición (H3): copia horarios, aula, profesor y cupo con otra fecha de inicio. Las fechas de las
// clases no se copian: al terminar lleva al Calendario de la edición nueva para asignarlas (R8).
export default function DuplicarEdicion({ cursoId, edicionId, sugerida }: { cursoId: string; edicionId: string; sugerida?: string }) {
  const router = useRouter()
  return (
    <ActionForm<R & { id?: string }> action={duplicarEdicion} submit="Duplicar edición"
      onSuccess={(s) => { if (s.id) router.push(`/campus/admin/cursos/${cursoId}/ediciones/${s.id}?tab=calendario`) }}>
      <input type="hidden" name="id" value={edicionId} />
      <Field label="Fecha de inicio de la nueva edición" name="fecha_inicio" type="date" defaultValue={sugerida} required
        hint="Tiene que empezar después de que termine la anterior (una edición por vez)." />
      <p className="text-sm text-on-surface-variant">Se copian los horarios, el aula, el profesor y el cupo. La nueva edición empieza sin alumnos y sin fechas de clase: las vas a asignar en el paso siguiente.</p>
    </ActionForm>
  )
}
