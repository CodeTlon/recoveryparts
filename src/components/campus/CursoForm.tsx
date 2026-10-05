'use client'

import { ImageField } from './ImageField'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionForm, Check } from './forms'
import { Field, Select } from './forms'
import { guardarCurso, type R } from '@/app/campus/admin/actions'

type Curso = Record<string, any>
type Opt = [string, string][]
type Aula = { id: string; nombre: string; capacidad: number | null; activa?: boolean }

export default function CursoForm({ curso, aulas, profesores }: { curso?: Curso; aulas: Aula[]; profesores: Opt }) {
  const router = useRouter()
  // RF-03: el cupo no puede superar la capacidad del aula (lo valida la base); acá se sugiere y se limita en el input.
  const capacidad = (id?: string | null) => aulas.find((a) => a.id === id)?.capacidad ?? null
  const [maxAula, setMaxAula] = useState(() => capacidad(curso?.aula_id))
  const aulaOpts: Opt = aulas.map((a) => [a.id, `${a.nombre}${a.capacidad != null ? ` · ${a.capacidad} lugares` : ''}${a.activa === false ? ' (dada de baja)' : ''}`])
  // Al elegir un aula: si el cupo está vacío, se completa con la capacidad (el admin lo baja si quiere).
  const onAula = (e: React.FormEvent<HTMLDivElement>) => {
    const t = e.target as HTMLSelectElement
    if (t.name !== 'aula_id') return
    const cap = capacidad(t.value)
    setMaxAula(cap)
    const cupo = t.form?.elements.namedItem('cupo') as HTMLInputElement | null
    if (cupo && !cupo.value && cap != null) cupo.value = String(cap)
  }
  // Un curso nuevo pasa a su página de edición al guardarse.
  const onSuccess = (s: R & { id?: string }) => { if (s.id && !curso) router.replace(`/campus/admin/cursos/${s.id}`) }
  const c = curso ?? {}
  return (
    <ActionForm<R & { id?: string }> action={guardarCurso} submit={curso ? 'Guardar cambios' : 'Crear curso'} reset={false} onSuccess={onSuccess} className="card p-6">
      {curso && <input type="hidden" name="id" value={curso.id} />}
      <div className="grid gap-4 sm:grid-cols-2" onChange={onAula}>
        <Field label="Nombre" name="nombre" placeholder="Ej: Reparación de celulares" defaultValue={c.nombre} required />
        <Field label="Slug (URL)" name="slug" placeholder="ej-reparacion-de-celulares" defaultValue={c.slug} hint="Vacío = se genera del nombre." />
        <Select name="area" label="Área" defaultValue={c.area ?? 'tecnico'} options={[['diseno', 'Creación y Diseño'], ['tecnico', 'Reparación y Tecnología']]} />
        <Select name="tipo" label="Tipo" defaultValue={c.tipo ?? 'curso'} options={[['curso', 'Curso'], ['taller', 'Taller (formato corto: 1 jornada, días seguidos o 1–2 semanas)']]} />
        <Select name="nivel" label="Nivel" defaultValue={c.nivel ?? ''} empty="Sin nivel" options={[['Inicial', 'Inicial'], ['Intermedio', 'Intermedio'], ['Avanzado', 'Avanzado']]} />
        <Field label="Duración (semanas)" name="duracion_semanas" placeholder="Ej: 12" type="number" min={1} max={104} defaultValue={c.duracion_semanas} />
        <Field label="Cupo máximo" name="cupo" placeholder="Ej: 12" type="number" min={1} max={maxAula ?? 500} defaultValue={c.cupo} required
          hint={`No puede ser menor que los alumnos ya asignados.${maxAula != null ? ` Máximo del aula: ${maxAula}.` : ''}`} />
        <Field label="Fecha de inicio" name="fecha_inicio" type="date" defaultValue={c.fecha_inicio} />
        <Select name="aula_id" label="Aula" defaultValue={c.aula_id} empty="Sin asignar" options={aulaOpts} />
        <Select name="profesor_id" label="Profesor (uno solo)" defaultValue={c.profesor_id} empty="Sin asignar" options={profesores} />
        <Field label="Precio (ARS) — solo se muestra" name="precio" placeholder="Ej: 90000" type="number" min={0} step={100} defaultValue={c.precio} />
        <Field label="Descuento (%)" name="descuento_pct" placeholder="Ej: 10" type="number" min={0} max={100} defaultValue={c.descuento_pct} />
        <ImageField label="Imagen del curso" name="imagen_url" defaultValue={c.imagen_url} />
        <Field label="Video (link YouTube/Drive)" name="video_url" placeholder="https://www.youtube.com/watch?v=…" defaultValue={c.video_url} />
        <Field label="Orden" name="orden" placeholder="Ej: 1" type="number" min={0} defaultValue={c.orden ?? 0} />
        <Check name="destacado" defaultChecked={c.destacado} className="self-end pb-3">Mostrar como destacado en el inicio</Check>
      </div>
      <Field label="Descripción pública (qué se aprende y para quién)" name="descripcion" placeholder="Contá qué se aprende y para quién…" rows={5} defaultValue={c.descripcion} />
      <Field label="Requisitos previos" name="requisitos" placeholder="Ej: Secundario completo, ganas de aprender" rows={3} defaultValue={c.requisitos} />
    </ActionForm>
  )
}
