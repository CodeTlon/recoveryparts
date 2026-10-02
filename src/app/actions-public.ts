'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/env'

export type FormState = { ok?: boolean; error?: string }

// RF-42: guarda la consulta en la bandeja interna. (El mail de aviso lo dispara un
// Database Webhook / Edge Function configurado en docs/SETUP-SUPABASE.md.)
export async function enviarContacto(_: FormState, fd: FormData): Promise<FormState> {
  if (!supabaseConfigured) return { error: 'El formulario no está disponible por el momento.' }
  if (fd.get('website')) return { ok: true } // honeypot anti-spam
  const nombre = String(fd.get('nombre') ?? '').trim()
  const email = String(fd.get('email') ?? '').trim()
  const mensaje = String(fd.get('mensaje') ?? '').trim()
  if (!nombre || !/^\S+@\S+\.\S+$/.test(email) || !mensaje) return { error: 'Completá nombre, un email válido y tu consulta.' }
  const sb = await createClient()
  const { error } = await sb.from('contactos').insert({ nombre, email, telefono: String(fd.get('telefono') ?? '').trim() || null, mensaje })
  return error ? { error: 'No pudimos enviar tu consulta. Intentá de nuevo.' } : { ok: true }
}

// RF-52: registra demanda de cursos que todavía no se dictan.
export async function registrarDemanda(_: FormState, fd: FormData): Promise<FormState> {
  if (!supabaseConfigured) return { error: 'No disponible por el momento.' }
  const interes = String(fd.get('interes') ?? '').trim()
  if (!interes) return { error: 'Contanos qué curso te interesa.' }
  const sb = await createClient()
  const { error } = await sb.from('demanda_cursos').insert({ interes, contacto: String(fd.get('contacto') ?? '').trim() || null })
  return error ? { error: 'No pudimos registrar tu interés.' } : { ok: true }
}
