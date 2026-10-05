'use client'

import { useRouter } from 'next/navigation'
import { ActionForm, Check } from './forms'
import { Field, Select } from './forms'
import { guardarCurso, type R } from '@/app/campus/admin/actions'

type Curso = Record<string, any>
type Opt = [string, string][]

export default function CursoForm({ curso, aulas, profesores }: { curso?: Curso; aulas: Opt; profesores: Opt }) {
  const router = useRouter()
  // Un curso nuevo pasa a su página de edición al guardarse.
  const onSuccess = (s: R & { id?: string }) => { if (s.id && !curso) router.replace(`/campus/admin/cursos/${s.id}`) }
  const c = curso ?? {}
  return (
    <ActionForm<R & { id?: string }> action={guardarCurso} submit={curso ? 'Guardar cambios' : 'Crear curso'} reset={false} onSuccess={onSuccess} className="card p-6">
      {curso && <input type="hidden" name="id" value={curso.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="nombre" placeholder="Ej: Reparación de celulares" defaultValue={c.nombre} required />
        <Field label="Slug (URL)" name="slug" placeholder="ej-reparacion-de-celulares" defaultValue={c.slug} hint="Vacío = se genera del nombre." />
        <Select name="area" label="Área" defaultValue={c.area ?? 'tecnico'} options={[['diseno', 'Creación y Diseño'], ['tecnico', 'Reparación y Tecnología']]} />
        <Select name="tipo" label="Tipo" defaultValue={c.tipo ?? 'curso'} options={[['curso', 'Curso'], ['taller', 'Taller (1–2 clases)']]} />
        <Select name="nivel" label="Nivel" defaultValue={c.nivel ?? ''} empty="Sin nivel" options={[['Inicial', 'Inicial'], ['Intermedio', 'Intermedio'], ['Avanzado', 'Avanzado']]} />
        <Field label="Duración (semanas)" name="duracion_semanas" placeholder="Ej: 12" type="number" defaultValue={c.duracion_semanas} />
        <Field label="Cupo máximo" name="cupo" placeholder="Ej: 12" type="number" defaultValue={c.cupo} required hint="No puede ser menor que los alumnos ya asignados." />
        <Field label="Fecha de inicio" name="fecha_inicio" type="date" defaultValue={c.fecha_inicio} />
        <Select name="aula_id" label="Aula" defaultValue={c.aula_id} empty="Sin asignar" options={aulas} />
        <Select name="profesor_id" label="Profesor (uno solo)" defaultValue={c.profesor_id} empty="Sin asignar" options={profesores} />
        <Field label="Precio (ARS) — solo se muestra" name="precio" placeholder="Ej: 90000" type="number" defaultValue={c.precio} />
        <Field label="Descuento (%)" name="descuento_pct" placeholder="Ej: 10" type="number" defaultValue={c.descuento_pct} />
        <Field label="Imagen (URL)" name="imagen_url" placeholder="https://…/imagen.jpg" defaultValue={c.imagen_url} hint="Subila en Sitio web › Imágenes y pegá la URL." />
        <Field label="Video (link YouTube/Drive)" name="video_url" placeholder="https://www.youtube.com/watch?v=…" defaultValue={c.video_url} />
        <Field label="Orden" name="orden" placeholder="Ej: 1" type="number" defaultValue={c.orden ?? 0} />
        <Check name="destacado" defaultChecked={c.destacado} className="self-end pb-3">Mostrar como destacado en el inicio</Check>
      </div>
      <Field label="Descripción pública (qué se aprende y para quién)" name="descripcion" placeholder="Contá qué se aprende y para quién…" rows={5} defaultValue={c.descripcion} />
      <Field label="Requisitos previos" name="requisitos" placeholder="Ej: Secundario completo, ganas de aprender" rows={3} defaultValue={c.requisitos} />
    </ActionForm>
  )
}
