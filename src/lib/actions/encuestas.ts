'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin, getUserAndProfile } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionState } from '@/lib/actions/auth'

const preguntaSchema = z.object({
  curso_id: z.coerce.number().int().positive(),
  pregunta: z.string().trim().min(1, 'Ingresá la pregunta').max(300),
  tipo: z.enum(['rating', 'texto']),
})

export async function crearPreguntaEncuestaAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = preguntaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const supabase = await createClient()
  const { error } = await supabase.from('encuesta_preguntas').insert(parsed.data)
  if (error) return { error: 'No pudimos guardar la pregunta.' }

  revalidatePath(`/admin/cursos/${parsed.data.curso_id}`)
  return { success: 'Pregunta agregada.' }
}

export async function eliminarPreguntaEncuestaAction(preguntaId: number, cursoId: number) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('encuesta_preguntas').delete().eq('id', preguntaId)
  revalidatePath(`/admin/cursos/${cursoId}`)
}

// RF-47: el alumno responde una vez por curso finalizado. Se guarda que
// respondió (encuesta_completada, CON matricula_id) separado de la respuesta
// en sí (encuesta_respuestas, SIN ningún id de alumno) — ver migración 0004.
export async function responderEncuestaAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await getUserAndProfile()
  if (!user) return { error: 'No autorizado.' }

  const matriculaId = Number(formData.get('matricula_id'))
  if (!matriculaId) return { error: 'Matrícula inválida.' }

  const supabase = await createClient()

  const { data: matricula } = await supabase
    .from('matriculas')
    .select('id, alumno_id, curso_id')
    .eq('id', matriculaId)
    .maybeSingle()
  if (!matricula || matricula.alumno_id !== user.id) return { error: 'No autorizado.' }

  const { data: yaCompleto } = await supabase.from('encuesta_completada').select('matricula_id').eq('matricula_id', matriculaId).maybeSingle()
  if (yaCompleto) return { error: 'Ya respondiste esta encuesta.' }

  const { data: preguntas } = await supabase.from('encuesta_preguntas').select('id').eq('curso_id', matricula.curso_id)
  const respuestas = (preguntas ?? [])
    .map((p) => ({ pregunta_id: p.id, respuesta: String(formData.get(`respuesta_${p.id}`) || '').trim() }))
    .filter((r) => r.respuesta)

  if (respuestas.length) await supabase.from('encuesta_respuestas').insert(respuestas)
  await supabase.from('encuesta_completada').insert({ matricula_id: matriculaId })

  revalidatePath(`/alumno/cursos/${matricula.curso_id}`)
  return { success: '¡Gracias por tu respuesta!' }
}

// Los resultados se sirven con el cliente admin (service role) a propósito:
// encuesta_respuestas no tiene policy de SELECT (ver migración 0004), así que
// ni is_admin() la puede leer con el cliente normal — evita que un cambio de
// policy futuro filtre por error "mis respuestas" en una tabla que no tiene
// columna de usuario para filtrar.
export async function obtenerResultadosEncuesta(cursoId: number) {
  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) return null
  if (profile.rol !== 'administrador') {
    const supabase = await createClient()
    const { data: curso } = await supabase.from('cursos').select('profesor_id').eq('id', cursoId).maybeSingle()
    if (curso?.profesor_id !== user.id) return null
  }

  const admin = createAdminClient()
  const { data: preguntas } = await admin
    .from('encuesta_preguntas')
    .select('id, pregunta, tipo, encuesta_respuestas(respuesta)')
    .eq('curso_id', cursoId)
    .order('orden')

  return preguntas as unknown as { id: number; pregunta: string; tipo: string; encuesta_respuestas: { respuesta: string }[] }[] | null
}
