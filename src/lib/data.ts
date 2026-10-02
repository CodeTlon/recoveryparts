import { createClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/env'
import type { CursoPublico, Horario } from '@/lib/types'

// Todo el contenido público sale de la base (CMS). Sin Supabase configurado, devuelve vacíos.
export type Settings = {
  contacto: { direccion?: string; telefono?: string; email?: string; whatsapp?: string; instagram?: string; horario?: string }
  hero: { titulo?: string; subtitulo?: string; imagen_url?: string; cta_cursos?: string; cta_whatsapp?: string }
  stats: { aulas?: number; profesores?: number; egresados?: number }
  nosotros: { titulo?: string; texto?: string }
  areas: Record<'diseno' | 'tecnico', { titulo?: string; texto?: string; imagen_url?: string }>
}

const EMPTY_AREAS = { diseno: {}, tecnico: {} }

export async function getSettings(): Promise<Settings> {
  const base = { contacto: {}, hero: {}, stats: {}, nosotros: {}, areas: EMPTY_AREAS } as Settings
  if (!supabaseConfigured) return base
  try {
    const sb = await createClient()
    const { data } = await sb.from('site_settings').select('clave, valor')
    for (const r of data ?? []) (base as any)[r.clave] = r.valor
  } catch {}
  return base
}

export async function query<T>(fn: (sb: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{ data: T | null }>, fallback: T): Promise<T> {
  if (!supabaseConfigured) return fallback
  try {
    const { data } = await fn(await createClient())
    return data ?? fallback
  } catch {
    return fallback
  }
}

export const getCursos = () =>
  query<CursoPublico[]>((sb) => sb.from('cursos_publicos').select('*').order('orden'), [])
export const getHorarios = () =>
  query<Horario[]>((sb) => sb.from('horarios_publicos').select('*'), [])

export const waLink = (numero?: string, texto = 'Hola! Quiero consultar por un curso.') =>
  numero ? `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}` : undefined
