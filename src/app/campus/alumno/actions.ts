'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import type { R } from '../admin/actions'

// RF-47: respuesta anónima. La función de base guarda "completó" (alumno) y la respuesta (sin alumno).
export async function responderEncuesta(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('alumno')
  const id = String(fd.get('encuesta_id') ?? '')
  const respuestas: Record<string, string> = {}
  for (const [k, v] of fd.entries()) if (k.startsWith('p_') && typeof v === 'string' && v.trim()) respuestas[k.slice(2)] = v.trim().slice(0, 2000)
  if (!Object.keys(respuestas).length) return { error: 'Respondé al menos una pregunta.' }
  const { error } = await sb.rpc('responder_encuesta', { p_encuesta: id, p_respuestas: respuestas })
  if (error) return { error: /duplicate|unique/.test(error.message) ? 'Ya respondiste esta encuesta.' : 'No pudiste responder esta encuesta.' }
  revalidatePath('/campus/alumno')
  return { ok: true }
}
