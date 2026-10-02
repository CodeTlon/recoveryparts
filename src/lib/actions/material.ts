'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getUserAndProfile } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/actions/auth'

const MAX_PDF = 25 * 1024 * 1024

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
  url: z.string().trim().optional(),
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

  // PDF: archivo (bucket privado) o, como antes, un link externo. Link de video: siempre URL.
  const archivo = formData.get('archivo')
  const hayArchivo = archivo instanceof File && archivo.size > 0
  const urlOk = d.url && z.string().url().safeParse(d.url).success
  if (d.tipo === 'link' && !urlOk) return { error: 'Ingresá una URL válida.' }
  if (d.tipo === 'pdf' && !hayArchivo && !urlOk) return { error: 'Subí un PDF o ingresá una URL válida.' }
  if (d.tipo === 'pdf' && hayArchivo) {
    if (archivo.size > MAX_PDF) return { error: 'El PDF supera los 25 MB.' }
    const head = new TextDecoder().decode(new Uint8Array(await archivo.slice(0, 5).arrayBuffer()))
    if (archivo.type !== 'application/pdf' || head !== '%PDF-') return { error: 'El archivo no es un PDF válido.' }
  }

  const liberado_en = d.liberar_ahora ? new Date().toISOString() : d.liberado_en ? new Date(d.liberado_en).toISOString() : null

  const supabase = await createClient()
  let storage_path: string | null = null
  if (d.tipo === 'pdf' && hayArchivo) {
    storage_path = `${d.curso_id}/${crypto.randomUUID()}.pdf`
    const up = await supabase.storage.from('materiales').upload(storage_path, archivo, { contentType: 'application/pdf' })
    if (up.error) return { error: 'No pudimos subir el PDF.' }
  }
  const { error } = await supabase.from('materiales').insert({
    curso_id: d.curso_id,
    clase_id: d.clase_id ?? null,
    titulo: d.titulo,
    tipo: d.tipo,
    url: storage_path ? null : d.url,
    storage_path,
    liberado_en,
  })
  if (error) {
    if (storage_path) await supabase.storage.from('materiales').remove([storage_path])
    return { error: 'No pudimos guardar el material.' }
  }

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
  const { data: m } = await supabase.from('materiales').select('storage_path').eq('id', materialId).maybeSingle()
  const { error } = await supabase.from('materiales').delete().eq('id', materialId)
  if (!error && m?.storage_path) await supabase.storage.from('materiales').remove([m.storage_path])
  revalidatePath(`/profesor/cursos/${cursoId}`)
}
