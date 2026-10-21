import { cache } from 'react'
import { connection } from 'next/server'
import { unstable_cache } from 'next/cache'
import { TAG_PUBLICO, TTL_PUBLICO } from '@/lib/cache-publico'
import { clienteAnon, type Cliente } from '@/lib/db'
import { dbConfigured } from '@/lib/env'
import type { CursoPublico, EdicionPublica, Horario } from '@/lib/types'

// Todo el contenido público sale de la base (CMS). Sin base configurada, devuelve vacíos.
export type Settings = {
  contacto: { direccion?: string; telefono?: string; email?: string; whatsapp?: string; instagram?: string; horario?: string }
  hero: { titulo?: string; subtitulo?: string; imagen_url?: string; video_url?: string; cta_cursos?: string; cta_whatsapp?: string }
  stats: { aulas?: number; profesores?: number; egresados?: number }
  nosotros: { titulo?: string; texto?: string }
  areas: Record<'diseno' | 'tecnico', { titulo?: string; texto?: string; imagen_url?: string }>
}

const EMPTY_AREAS = { diseno: {}, tecnico: {} }

// cache(): dentro de un mismo render (página + footer + generateMetadata) la consulta se hace una sola vez.
export const getSettings = cache(async (): Promise<Settings> => {
  const base = { contacto: {}, hero: {}, stats: {}, nosotros: {}, areas: EMPTY_AREAS } as Settings
  await connection() // el contenido sale de la base: siempre dinámico, aunque el build no tenga DATABASE_URL
  if (!dbConfigured) return base
  try {
    const data = await settingsCacheadas()
    for (const r of data) (base as any)[r.clave] = r.valor
  } catch (e) { console.error('data: site_settings', (e as Error).name) }
  return base
})

// Caché de datos de Next (entre requests): 60 s o hasta que una server action llame a invalidarPublico().
// Si la consulta falla se lanza el error: unstable_cache no guarda los fallos, así no se cachea un vacío.
const settingsCacheadas = unstable_cache(async () => {
  const { data, error } = await clienteAnon().from('site_settings').select('clave, valor')
  if (error) throw new Error(error.code ?? 'site_settings')
  return (data ?? []) as { clave: string; valor: unknown }[]
}, ['site_settings'], { tags: [TAG_PUBLICO], revalidate: TTL_PUBLICO })

// `clave` identifica la consulta en el caché de Next (incluir ahí los parámetros, ej. `kit:${cursoId}`).
export async function query<T>(clave: string, fn: (sb: Cliente) => PromiseLike<{ data: T | null; error?: { code?: string } | null }>, fallback: T): Promise<T> {
  await connection()
  if (!dbConfigured) return fallback
  try {
    return await unstable_cache(async () => {
      const { data, error } = await fn(clienteAnon())
      if (error) throw new Error(error.code ?? 'consulta')
      return (data ?? fallback) as T
    }, ['publico', clave], { tags: [TAG_PUBLICO], revalidate: TTL_PUBLICO })()
  } catch (e) {
    console.error('data: consulta', clave, (e as Error).message)
    return fallback
  }
}

export const getCursos = cache(() =>
  query<CursoPublico[]>('cursos', (sb) => sb.from('cursos_publicos').select('*').order('orden'), []))
export const getEdiciones = cache(() =>
  query<EdicionPublica[]>('ediciones', (sb) => sb.from('ediciones_publicas').select('id, curso_id, fecha_inicio, fecha_fin, cupo, cupos_disponibles, aula, profesor_nombre').order('fecha_inicio'), []))
export const getHorarios = cache(() =>
  query<Horario[]>('horarios', (sb) => sb.from('horarios_publicos').select('*').order('dia_semana').order('hora_inicio'), []))

export const waLink = (numero?: string, texto = 'Hola! Quiero consultar por un curso.') =>
  numero ? `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}` : undefined
