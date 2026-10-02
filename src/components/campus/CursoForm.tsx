'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'
import { Field, Select } from './ui'
import { guardarCurso, type R } from '@/app/campus/admin/actions'

type Curso = Record<string, any>
type Opt = [string, string][]

export default function CursoForm({ curso, aulas, profesores }: { curso?: Curso; aulas: Opt; profesores: Opt }) {
  const router = useRouter()
  const [s, run, pending] = useActionState<R & { id?: string }, FormData>(guardarCurso, {})
  useEffect(() => { if (s.ok && s.id && !curso) router.replace(`/campus/admin/cursos/${s.id}`) }, [s, curso, router])
  const c = curso ?? {}
  return (
    <form action={run} className="card space-y-4 p-6">
      {curso && <input type="hidden" name="id" value={curso.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="nombre" defaultValue={c.nombre} required />
        <Field label="Slug (URL)" name="slug" defaultValue={c.slug} hint="Vacío = se genera del nombre." />
        <Select name="area" label="Área" defaultValue={c.area ?? 'tecnico'} options={[['diseno', 'Creación y Diseño'], ['tecnico', 'Reparación y Tecnología']]} />
        <Select name="tipo" label="Tipo" defaultValue={c.tipo ?? 'curso'} options={[['curso', 'Curso'], ['taller', 'Taller (1–2 clases)']]} />
        <Select name="nivel" label="Nivel" defaultValue={c.nivel ?? ''} empty="Sin nivel" options={[['Inicial', 'Inicial'], ['Intermedio', 'Intermedio'], ['Avanzado', 'Avanzado']]} />
        <Field label="Duración (semanas)" name="duracion_semanas" type="number" defaultValue={c.duracion_semanas} />
        <Field label="Cupo máximo" name="cupo" type="number" defaultValue={c.cupo} required hint="No puede ser menor que los alumnos ya asignados." />
        <Field label="Fecha de inicio" name="fecha_inicio" type="date" defaultValue={c.fecha_inicio} />
        <Select name="aula_id" label="Aula" defaultValue={c.aula_id} empty="Sin asignar" options={aulas} />
        <Select name="profesor_id" label="Profesor (uno solo)" defaultValue={c.profesor_id} empty="Sin asignar" options={profesores} />
        <Field label="Precio (ARS) — solo se muestra" name="precio" type="number" defaultValue={c.precio} />
        <Field label="Descuento (%)" name="descuento_pct" type="number" defaultValue={c.descuento_pct} />
        <Field label="Imagen (URL)" name="imagen_url" defaultValue={c.imagen_url} hint="Subila en Sitio web › Imágenes y pegá la URL." />
        <Field label="Video (link YouTube/Drive)" name="video_url" defaultValue={c.video_url} />
        <Field label="Orden" name="orden" type="number" defaultValue={c.orden ?? 0} />
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="destacado" defaultChecked={c.destacado} /> Mostrar como destacado en el inicio</label>
      </div>
      <Field label="Descripción pública (qué se aprende y para quién)" name="descripcion" rows={5} defaultValue={c.descripcion} />
      <Field label="Requisitos previos" name="requisitos" rows={3} defaultValue={c.requisitos} />
      {s.error && <p role="alert" className="text-sm text-red-400">{s.error}</p>}
      {s.ok && <p role="status" className="text-sm text-green-400">Guardado.</p>}
      <button disabled={pending} className="btn-primary">{pending ? 'Guardando…' : curso ? 'Guardar cambios' : 'Crear curso'}</button>
    </form>
  )
}
