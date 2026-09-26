'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/actions/auth'

const DIA_MS = 24 * 60 * 60 * 1000

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Espejo en JS de public.horarios_se_superponen() — evita un roundtrip por curso candidato.
function seSuperponen(
  diasA: number[], inicioA: string, finA: string,
  diasB: number[], inicioB: string, finB: string,
) {
  const compartenDia = diasA.some((d) => diasB.includes(d))
  return compartenDia && inicioA < finB && finA > inicioB
}

const cursoSchema = z.object({
  titulo: z.string().trim().min(3, 'Ingresá un título').max(160),
  tipo: z.enum(['curso', 'taller']),
  area: z.enum(['tecnico', 'diseno']),
  descripcion: z.string().trim().min(1, 'Ingresá una descripción'),
  requisitos: z.string().trim().optional(),
  dias_semana: z
    .array(z.coerce.number().int().min(0).max(6))
    .min(1, 'Elegí al menos un día'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  aula: z.string().trim().min(1, 'Ingresá el aula'),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  duracion_semanas: z.coerce.number().int().min(1).max(104),
  profesor_id: z.string().uuid('Elegí un profesor'),
  cupo_total: z.coerce.number().int().min(1, 'El cupo debe ser mayor a 0'),
  precio: z.coerce.number().min(0),
  precio_descuento: z.coerce.number().min(0).optional().or(z.literal('')),
  publicado: z.coerce.boolean().optional(),
})

function parseCursoForm(formData: FormData) {
  const raw = Object.fromEntries(formData)
  return cursoSchema.safeParse({
    ...raw,
    dias_semana: formData.getAll('dias_semana'),
    publicado: formData.get('publicado') === 'on',
    precio_descuento: raw.precio_descuento || undefined,
  })
}

export async function crearCursoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = parseCursoForm(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data
  if (d.hora_fin <= d.hora_inicio) return { error: 'La hora de fin debe ser posterior a la de inicio' }

  const supabase = await createClient()

  // RF-17 (aula) + RF-18 (profesor, un único curso a la vez): traer candidatos
  // que compartan aula o profesor y chequear superposición en JS.
  const { data: candidatos } = await supabase
    .from('cursos')
    .select('id, titulo, aula, profesor_id, dias_semana, hora_inicio, hora_fin')
    .neq('estado', 'de_baja')
    .or(`aula.eq.${d.aula},profesor_id.eq.${d.profesor_id}`)

  for (const c of candidatos ?? []) {
    const superpone = seSuperponen(d.dias_semana, d.hora_inicio, d.hora_fin, c.dias_semana, c.hora_inicio, c.hora_fin)
    if (!superpone) continue
    if (c.aula === d.aula) return { error: `El aula "${d.aula}" ya está ocupada por "${c.titulo}" en ese horario.` }
    if (c.profesor_id === d.profesor_id) return { error: `El profesor ya tiene "${c.titulo}" asignado en ese horario.` }
  }

  const slug = slugify(d.titulo)
  const { data: curso, error } = await supabase
    .from('cursos')
    .insert({
      slug,
      titulo: d.titulo,
      tipo: d.tipo,
      area: d.area,
      descripcion: d.descripcion,
      requisitos: d.requisitos || '',
      dias_semana: d.dias_semana,
      hora_inicio: d.hora_inicio,
      hora_fin: d.hora_fin,
      aula: d.aula,
      fecha_inicio: d.fecha_inicio,
      duracion_semanas: d.duracion_semanas,
      profesor_id: d.profesor_id,
      cupo_total: d.cupo_total,
      precio: d.precio,
      precio_descuento: d.precio_descuento || null,
      publicado: d.publicado ?? false,
    })
    .select('id')
    .single()

  if (error || !curso) {
    if (error?.message.includes('cursos_slug_key')) return { error: 'Ya existe un curso con un título muy similar.' }
    return { error: 'No pudimos crear el curso. Probá de nuevo.' }
  }

  // RF-31: generar el calendario completo de clases desde fecha_inicio.
  const totalClases = d.duracion_semanas * d.dias_semana.length
  const clases: { curso_id: number; numero: number; fecha: string }[] = []
  const cursor = new Date(`${d.fecha_inicio}T00:00:00`)
  let numero = 0
  // Avanza día a día hasta juntar `totalClases` fechas que caigan en dias_semana.
  while (numero < totalClases) {
    if (d.dias_semana.includes(cursor.getDay())) {
      numero += 1
      clases.push({ curso_id: curso.id, numero, fecha: cursor.toISOString().slice(0, 10) })
    }
    cursor.setTime(cursor.getTime() + DIA_MS)
  }
  if (clases.length) await supabase.from('clases').insert(clases)

  revalidatePath('/admin/cursos')
  redirect(`/admin/cursos/${curso.id}`)
}

export async function editarCursoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const cursoId = Number(formData.get('curso_id'))
  if (!cursoId) return { error: 'Curso inválido' }

  const parsed = parseCursoForm(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data
  if (d.hora_fin <= d.hora_inicio) return { error: 'La hora de fin debe ser posterior a la de inicio' }

  const supabase = await createClient()

  const { data: candidatos } = await supabase
    .from('cursos')
    .select('id, titulo, aula, profesor_id, dias_semana, hora_inicio, hora_fin')
    .neq('estado', 'de_baja')
    .neq('id', cursoId)
    .or(`aula.eq.${d.aula},profesor_id.eq.${d.profesor_id}`)

  for (const c of candidatos ?? []) {
    const superpone = seSuperponen(d.dias_semana, d.hora_inicio, d.hora_fin, c.dias_semana, c.hora_inicio, c.hora_fin)
    if (!superpone) continue
    if (c.aula === d.aula) return { error: `El aula "${d.aula}" ya está ocupada por "${c.titulo}" en ese horario.` }
    if (c.profesor_id === d.profesor_id) return { error: `El profesor ya tiene "${c.titulo}" asignado en ese horario.` }
  }

  // El calendario de clases NO se regenera al editar (ya puede tener clases
  // dictadas/liberadas con material asociado) — cambios de día/duración
  // requieren tocar `clases` a mano desde /admin/cursos/[id].
  const { error } = await supabase
    .from('cursos')
    .update({
      titulo: d.titulo,
      tipo: d.tipo,
      area: d.area,
      descripcion: d.descripcion,
      requisitos: d.requisitos || '',
      aula: d.aula,
      hora_inicio: d.hora_inicio,
      hora_fin: d.hora_fin,
      profesor_id: d.profesor_id,
      cupo_total: d.cupo_total,
      precio: d.precio,
      precio_descuento: d.precio_descuento || null,
      precio_actualizado_en: new Date().toISOString().slice(0, 10),
      publicado: d.publicado ?? false,
    })
    .eq('id', cursoId)

  if (error) return { error: 'No pudimos guardar los cambios.' }
  revalidatePath('/admin/cursos')
  revalidatePath(`/admin/cursos/${cursoId}`)
  return { success: 'Curso actualizado.' }
}

export async function darDeBajaCursoAction(cursoId: number) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('cursos').update({ estado: 'de_baja', publicado: false }).eq('id', cursoId)
  revalidatePath('/admin/cursos')
}
