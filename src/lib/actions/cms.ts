'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/actions/auth'

// ── Sitio (singleton) ──────────────────────────────────────
const sitioSchema = z.object({
  hero_titulo: z.string().trim().min(1),
  hero_subtitulo: z.string().trim().min(1),
  hero_imagen_url: z.string().trim().min(1),
  area_tecnico_titulo: z.string().trim().min(1),
  area_tecnico_descripcion: z.string().trim().min(1),
  area_diseno_titulo: z.string().trim().min(1),
  area_diseno_descripcion: z.string().trim().min(1),
  stat_aulas: z.coerce.number().int().min(0),
  stat_profesores: z.coerce.number().int().min(0),
  stat_egresados: z.coerce.number().int().min(0),
  whatsapp: z.string().trim().min(1),
  direccion: z.string().trim().min(1),
  instagram: z.string().trim().optional(),
  email_contacto: z.string().trim().email(),
})

export async function actualizarSitioConfigAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = sitioSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  const supabase = await createClient()
  const { error } = await supabase
    .from('sitio_config')
    .update({
      hero: { titulo: d.hero_titulo, subtitulo: d.hero_subtitulo, imagen_url: d.hero_imagen_url },
      areas: {
        tecnico: { titulo: d.area_tecnico_titulo, descripcion: d.area_tecnico_descripcion },
        diseno: { titulo: d.area_diseno_titulo, descripcion: d.area_diseno_descripcion },
      },
      stats: { aulas: d.stat_aulas, profesores: d.stat_profesores, egresados: d.stat_egresados },
      contacto: { whatsapp: d.whatsapp, direccion: d.direccion, instagram: d.instagram || null, email: d.email_contacto },
    })
    .eq('id', 1)
  if (error) return { error: 'No pudimos guardar los cambios.' }

  revalidatePath('/')
  revalidatePath('/admin/sitio')
  return { success: 'Sitio actualizado.' }
}

// ── Galería ─────────────────────────────────────────────────
const fotoSchema = z.object({
  url: z.string().trim().min(1, 'Ingresá la URL de la imagen'),
  categoria: z.enum(['aulas', 'clases', 'trabajos_alumnos', 'egresados', 'eventos']),
  alt: z.string().trim().min(1, 'Ingresá un texto alternativo'),
  descripcion: z.string().trim().optional(),
  orden: z.coerce.number().int().default(0),
})

export async function crearFotoGaleriaAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = fotoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const supabase = await createClient()
  const { error } = await supabase.from('galeria_fotos').insert(parsed.data)
  if (error) return { error: 'No pudimos guardar la foto.' }
  revalidatePath('/admin/galeria')
  revalidatePath('/galeria')
  return { success: 'Foto agregada.' }
}

export async function eliminarFotoGaleriaAction(id: number) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('galeria_fotos').delete().eq('id', id)
  revalidatePath('/admin/galeria')
  revalidatePath('/galeria')
}

export async function togglePublicadoAction(tabla: 'galeria_fotos' | 'testimonios' | 'faq' | 'egresados', id: number, publicado: boolean) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from(tabla).update({ publicado }).eq('id', id)
  revalidatePath('/admin/galeria')
  revalidatePath('/admin/testimonios')
  revalidatePath('/admin/faq')
  revalidatePath('/admin/egresados')
  revalidatePath('/')
  revalidatePath('/galeria')
}

// ── Testimonios ─────────────────────────────────────────────
const testimonioSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá un nombre'),
  curso_id: z.coerce.number().int().positive().optional().or(z.literal('')),
  puntaje: z.coerce.number().int().min(1).max(5),
  comentario: z.string().trim().min(1, 'Ingresá el comentario'),
  foto_url: z.string().trim().optional(),
  orden: z.coerce.number().int().default(0),
})

export async function crearTestimonioAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = testimonioSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const { curso_id, ...rest } = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.from('testimonios').insert({ ...rest, curso_id: curso_id || null, foto_url: rest.foto_url || null })
  if (error) return { error: 'No pudimos guardar el testimonio.' }
  revalidatePath('/admin/testimonios')
  revalidatePath('/')
  return { success: 'Testimonio agregado.' }
}

export async function eliminarTestimonioAction(id: number) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('testimonios').delete().eq('id', id)
  revalidatePath('/admin/testimonios')
  revalidatePath('/')
}

// ── FAQ ─────────────────────────────────────────────────────
const faqSchema = z.object({
  pregunta: z.string().trim().min(1, 'Ingresá la pregunta'),
  respuesta: z.string().trim().min(1, 'Ingresá la respuesta'),
  orden: z.coerce.number().int().default(0),
})

export async function crearFaqAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = faqSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const supabase = await createClient()
  const { error } = await supabase.from('faq').insert(parsed.data)
  if (error) return { error: 'No pudimos guardar la pregunta.' }
  revalidatePath('/admin/faq')
  revalidatePath('/')
  return { success: 'Pregunta agregada.' }
}

export async function eliminarFaqAction(id: number) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('faq').delete().eq('id', id)
  revalidatePath('/admin/faq')
  revalidatePath('/')
}

// ── Egresados ───────────────────────────────────────────────
const egresadoSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá un nombre'),
  especialidad: z.string().trim().min(1, 'Ingresá la especialidad'),
  foto_url: z.string().trim().min(1, 'Ingresá la URL de la foto'),
  destacado: z.coerce.boolean().optional(),
  orden: z.coerce.number().int().default(0),
})

export async function crearEgresadoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = egresadoSchema.safeParse({ ...Object.fromEntries(formData), destacado: formData.get('destacado') === 'on' })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const supabase = await createClient()
  const { error } = await supabase.from('egresados').insert(parsed.data)
  if (error) return { error: 'No pudimos guardar el egresado.' }
  revalidatePath('/admin/egresados')
  revalidatePath('/')
  return { success: 'Egresado agregado.' }
}

export async function eliminarEgresadoAction(id: number) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('egresados').delete().eq('id', id)
  revalidatePath('/admin/egresados')
  revalidatePath('/')
}

// ── Contactos ───────────────────────────────────────────────
export async function marcarContactoLeidoAction(id: number, leido: boolean) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('contactos').update({ leido }).eq('id', id)
  revalidatePath('/admin/contactos')
}
