'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getUserAndProfile } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/actions/auth'

async function requireDuenoDelCurso(cursoId: number) {
  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) return { autorizado: false as const }
  if (profile.rol === 'administrador') return { autorizado: true as const }
  const supabase = await createClient()
  const { data: curso } = await supabase.from('cursos').select('profesor_id').eq('id', cursoId).maybeSingle()
  return { autorizado: profile.rol === 'profesor' && curso?.profesor_id === user.id }
}

const temaSchema = z.object({
  clase_id: z.coerce.number().int().positive(),
  curso_id: z.coerce.number().int().positive(),
  tema: z.string().trim().max(200),
})

// RF-31/RF-37: temario "de alto nivel" cargado clase por clase.
export async function actualizarTemaClaseAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = temaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Datos inválidos' }
  const d = parsed.data

  const { autorizado } = await requireDuenoDelCurso(d.curso_id)
  if (!autorizado) return { error: 'No autorizado.' }

  const supabase = await createClient()
  const { error } = await supabase.from('clases').update({ tema: d.tema }).eq('id', d.clase_id)
  if (error) return { error: 'No pudimos guardar el tema.' }

  revalidatePath(`/profesor/cursos/${d.curso_id}`)
  revalidatePath(`/admin/cursos/${d.curso_id}`)
  return { success: 'Tema guardado.' }
}

const estadoClaseSchema = z.object({
  clase_id: z.coerce.number().int().positive(),
  curso_id: z.coerce.number().int().positive(),
  estado: z.enum(['programada', 'suspendida', 'reprogramada']),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// RF-38: suspender o reprogramar una clase — las suspendidas/reprogramadas
// no cuentan para el cálculo de deserción (ver lib/actions/matriculas.ts).
export async function cambiarEstadoClaseAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = estadoClaseSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Datos inválidos' }
  const d = parsed.data

  const { autorizado } = await requireDuenoDelCurso(d.curso_id)
  if (!autorizado) return { error: 'No autorizado.' }

  const supabase = await createClient()
  const update: Record<string, unknown> = { estado: d.estado }
  if (d.estado === 'reprogramada' && d.fecha) update.fecha = d.fecha
  const { error } = await supabase.from('clases').update(update).eq('id', d.clase_id)
  if (error) return { error: 'No pudimos actualizar la clase.' }

  revalidatePath(`/profesor/cursos/${d.curso_id}`)
  revalidatePath(`/admin/cursos/${d.curso_id}`)
  return { success: 'Clase actualizada.' }
}
