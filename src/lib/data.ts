import { cache } from 'react'
import { connection } from 'next/server'
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
    const sb = clienteAnon()
    const { data, error } = await sb.from('site_settings').select('clave, valor')
    if (error) console.error('data: site_settings', error.code)
    for (const r of data ?? []) (base as any)[r.clave] = r.valor
  } catch (e) { console.error('data: site_settings', (e as Error).name) }
  return base
})

export async function query<T>(fn: (sb: Cliente) => PromiseLike<{ data: T | null; error?: { code?: string } | null }>, fallback: T): Promise<T> {
  await connection()
  if (!dbConfigured) return fallback
  try {
    const { data, error } = await fn(clienteAnon())
    if (error) console.error('data: consulta', error.code)
    return data ?? fallback
  } catch (e) {
    console.error('data: consulta', (e as Error).name)
    return fallback
  }
}

export const getCursos = cache(() =>
  query<CursoPublico[]>((sb) => sb.from('cursos_publicos').select('*').order('orden'), []))
export const getEdiciones = cache(() =>
  query<EdicionPublica[]>((sb) => sb.from('ediciones_publicas').select('id, curso_id, fecha_inicio, fecha_fin, cupo, cupos_disponibles, aula, profesor_nombre').order('fecha_inicio'), []))
export const getHorarios = cache(() =>
  query<Horario[]>((sb) => sb.from('horarios_publicos').select('*').order('dia_semana').order('hora_inicio'), []))

export const waLink = (numero?: string, texto = 'Hola! Quiero consultar por un curso.') =>
  numero ? `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}` : undefined
