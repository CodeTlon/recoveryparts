'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getUserAndProfile } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/actions/auth'

async function requireDuenoDelCurso(cursoId: number) {
  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) return false
  if (profile.rol === 'administrador') return true
  const supabase = await createClient()
  const { data: curso } = await supabase.from('cursos').select('profesor_id').eq('id', cursoId).maybeSingle()
  return profile.rol === 'profesor' && curso?.profesor_id === user.id
}

const subirSchema = z.object({
  curso_id: z.coerce.number().int().positive(),
  clase_id: z.coerce.number().int().positive().optional(),
  titulo: z.string().trim().min(1, 'Ingresá un título').max(160),
  tipo: z.enum(['pdf', 'link']),
  url: z.string().trim().url('Ingresá una URL válida'),
  liberar_ahora: z.coerce.boolean().optional(),
  liberado_en: z.string().optional(), // datetime-local
})

// RF-36: el profesor sube material (PDF o link externo). RF-32/34: se puede
// liberar ya mismo o programar la fecha — ambas usan la misma columna
// `liberado_en` (ver comentario en la migración 0003_material.sql).
export async function subirMaterialAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = subirSchema.safeParse({
    ...Object.fromEntries(formData),
    liberar_ahora: formData.get('liberar_ahora') === 'on',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  if (!(await requireDuenoDelCurso(d.curso_id))) return { error: 'No autorizado.' }

  const liberado_en = d.liberar_ahora ? new Date().toISOString() : d.liberado_en ? new Date(d.liberado_en).toISOString() : null

  const supabase = await createClient()
  const { error } = await supabase.from('materiales').insert({
    curso_id: d.curso_id,
    clase_id: d.clase_id ?? null,
    titulo: d.titulo,
    tipo: d.tipo,
    url: d.url,
    liberado_en,
  })
  if (error) return { error: 'No pudimos guardar el material.' }

  revalidatePath(`/profesor/cursos/${d.curso_id}`)
  revalidatePath(`/admin/cursos/${d.curso_id}`)
  return { success: 'Material cargado.' }
}

export async function liberarMaterialAction(materialId: number, cursoId: number) {
  if (!(await requireDuenoDelCurso(cursoId))) return
  const supabase = await createClient()
  await supabase.from('materiales').update({ liberado_en: new Date().toISOString() }).eq('id', materialId)
  revalidatePath(`/profesor/cursos/${cursoId}`)
}

export async function eliminarMaterialAction(materialId: number, cursoId: number) {
  if (!(await requireDuenoDelCurso(cursoId))) return
  const supabase = await createClient()
  await supabase.from('materiales').delete().eq('id', materialId)
  revalidatePath(`/profesor/cursos/${cursoId}`)
}
