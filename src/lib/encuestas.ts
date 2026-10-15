import 'server-only'
import type { Cliente } from '@/lib/db'

export type EncuestaPendiente = { id: string; titulo: string; edicion_id: string }

// RF-47: encuestas que el alumno todavía no respondió. RLS ya limita las encuestas a las activas de los cursos
// donde no es desertor; acá solo se quitan las que completó. La respuesta es anónima: `encuesta_completadas`
// guarda quién respondió, nunca qué respondió.
export async function encuestasPendientes(sb: Cliente, alumnoId: string): Promise<EncuestaPendiente[]> {
  const [{ data: encuestas }, { data: hechas }] = await Promise.all([
    sb.from('encuestas').select('id, titulo, edicion_id').eq('activa', true).order('creado_en'),
    sb.from('encuesta_completadas').select('encuesta_id').eq('alumno_id', alumnoId),
  ])
  const respondidas = new Set(((hechas ?? []) as { encuesta_id: string }[]).map((h) => h.encuesta_id))
  return ((encuestas ?? []) as EncuestaPendiente[]).filter((e) => !respondidas.has(e.id))
}
