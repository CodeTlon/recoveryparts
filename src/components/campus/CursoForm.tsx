'use client'

import { ImageField } from './ImageField'
import { useRouter } from 'next/navigation'
import { ActionForm, Check } from './forms'
import { Field, Select } from './forms'
import { guardarCurso, type R } from '@/app/campus/admin/actions'

type Curso = Record<string, any>

// Contenido del curso (catálogo): se carga una vez y lo comparten todas sus ediciones.
// Fecha, aula, profesor y cupo son de cada edición (EdicionForm).
export default function CursoForm({ curso }: { curso?: Curso }) {
  const router = useRouter()
  // Un curso nuevo pasa a su página para cargar el plan y crear la primera edición.
  const onSuccess = (s: R & { id?: string }) => { if (s.id && !curso) router.replace(`/campus/admin/cursos/${s.id}?tab=clases`) }
  const c = curso ?? {}
  return (
    <ActionForm<R & { id?: string }> action={guardarCurso} submit={curso ? 'Guardar cambios' : 'Crear curso'} reset={false} onSuccess={onSuccess} className="card p-6">
      {curso && <input type="hidden" name="id" value={curso.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="nombre" placeholder="Ej: Reparación de celulares" defaultValue={c.nombre} required />
        <Field label="Slug (URL)" name="slug" placeholder="ej-reparacion-de-celulares" defaultValue={c.slug} hint="Vacío = se genera del nombre." />
        <Select name="area" label="Área" defaultValue={c.area ?? 'tecnico'} options={[['diseno', 'Creación y Diseño'], ['tecnico', 'Reparación y Tecnología']]} />
        <Select name="tipo" label="Tipo" defaultValue={c.tipo ?? 'curso'} options={[['curso', 'Curso'], ['taller', 'Taller (formato corto: 1 jornada, días seguidos o 1–2 semanas)']]} />
        <Select name="nivel" label="Nivel" defaultValue={c.nivel ?? ''} empty="Sin nivel" options={[['Inicial', 'Inicial'], ['Intermedio', 'Intermedio'], ['Avanzado', 'Avanzado']]} />
        <Field label="Duración (semanas)" name="duracion_semanas" placeholder="Ej: 12" type="number" min={1} max={104} defaultValue={c.duracion_semanas} />
        <Field label="Precio (ARS) — solo se muestra" name="precio" placeholder="Ej: 90000" type="number" min={0} max={100000000} step={100} defaultValue={c.precio} hint="Un solo precio para todas las ediciones." />
        <Field label="Descuento (%)" name="descuento_pct" placeholder="Ej: 10" type="number" min={0} max={100} defaultValue={c.descuento_pct} />
        <ImageField label="Imagen del curso" name="imagen_url" defaultValue={c.imagen_url} />
        <Field label="Video (link YouTube/Drive)" name="video_url" placeholder="https://www.youtube.com/watch?v=…" defaultValue={c.video_url} />
        <Field label="Orden" name="orden" placeholder="Ej: 1" type="number" min={0} max={9999} defaultValue={c.orden ?? 0} />
        <Check name="destacado" defaultChecked={c.destacado} className="self-end pb-3">Mostrar como destacado en el inicio</Check>
      </div>
      <Field label="Descripción pública (qué se aprende y para quién)" name="descripcion" placeholder="Contá qué se aprende y para quién…" rows={5} defaultValue={c.descripcion} />
      <Field label="Requisitos previos" name="requisitos" placeholder="Ej: Secundario completo, ganas de aprender" rows={3} defaultValue={c.requisitos} />
    </ActionForm>
  )
}
