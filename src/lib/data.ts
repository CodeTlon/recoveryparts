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
  aulas: { texto?: string; video_url?: string; imagen_url?: string } // presentación de la sección «Aulas» (RF-60)
}

const EMPTY_AREAS = { diseno: {}, tecnico: {} }

// cache(): dentro de un mismo render (página + footer + generateMetadata) la consulta se hace una sola vez.
export const getSettings = cache(async (): Promise<Settings> => {
  const base = { contacto: {}, hero: {}, stats: {}, nosotros: {}, areas: EMPTY_AREAS, aulas: {} } as Settings
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

// RF-60: aulas del sitio. Las vistas ya traen solo las activas y visibles, sin capacidad ni datos internos.
export type AulaPublica = {
  id: string; nombre: string; descripcion: string | null; video_url: string | null; orden: number
  destacados: { tipo: string; texto: string }[]; fotos: { id: string; imagen_url: string; alt: string }[]
}
export const getAulasPublicas = cache(async (): Promise<AulaPublica[]> => {
  const [aulas, destacados, fotos] = await Promise.all([
    query<Omit<AulaPublica, 'destacados' | 'fotos'>[]>('aulas', (sb) => sb.from('aulas_publicas').select('id, nombre, descripcion, video_url, orden').order('orden').order('nombre'), []),
    query<{ aula_id: string; tipo: string; texto: string }[]>('aulas:destacados', (sb) => sb.from('aula_destacados_publicos').select('aula_id, tipo, texto').order('orden'), []),
    query<{ id: string; aula_id: string; imagen_url: string; alt: string }[]>('aulas:fotos', (sb) => sb.from('aula_fotos_publicas').select('id, aula_id, imagen_url, alt').order('orden'), []),
  ])
  return aulas.map((a) => ({
    ...a,
    destacados: destacados.filter((d) => d.aula_id === a.id).map(({ tipo, texto }) => ({ tipo, texto })),
    fotos: fotos.filter((f) => f.aula_id === a.id).map(({ id, imagen_url, alt }) => ({ id, imagen_url, alt })),
  }))
})
// El menú, la portada y el sitemap muestran «Aulas» solo si hay alguna visible.
export const hayAulasVisibles = cache(async () => (await getAulasPublicas()).length > 0)
