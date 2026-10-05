'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { supabaseConfigured } from '@/lib/supabase/env'
import { limited } from '@/lib/rate-limit'

export type FormState = { ok?: boolean; error?: string }

async function ip() {
  const h = await headers()
  return h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'
}
const DEMASIADOS = 'Enviaste muchas consultas seguidas. Probá de nuevo en unos minutos.'

// RF-42: guarda la consulta en la bandeja interna. (El mail de aviso lo dispara un
// Database Webhook / Edge Function configurado en docs/SETUP-SUPABASE.md.)
export async function enviarContacto(_: FormState, fd: FormData): Promise<FormState> {
  if (!supabaseConfigured) return { error: 'El formulario no está disponible por el momento.' }
  if (fd.get('website')) return { ok: true } // honeypot anti-spam
  if (limited(`contacto:${await ip()}`, 5, 15 * 60_000)) return { error: DEMASIADOS }
  const nombre = String(fd.get('nombre') ?? '').trim()
  const email = String(fd.get('email') ?? '').trim()
  const mensaje = String(fd.get('mensaje') ?? '').trim()
  const telefono = String(fd.get('telefono') ?? '').trim()
  if (!nombre || !/^\S+@\S+\.\S+$/.test(email) || !mensaje) return { error: 'Completá nombre, un email válido y tu consulta.' }
  if (nombre.length > 120 || mensaje.length > 4000 || email.length > 254 || telefono.length > 40) return { error: 'Alguno de los datos es demasiado largo.' }
  const sb = await createClient()
  const { error } = await sb.from('contactos').insert({ nombre, email, telefono: telefono || null, mensaje })
  return error ? { error: 'No pudimos enviar tu consulta. Intentá de nuevo.' } : { ok: true }
}

// RF-52: registra demanda de cursos que todavía no se dictan.
export async function registrarDemanda(_: FormState, fd: FormData): Promise<FormState> {
  if (!supabaseConfigured) return { error: 'No disponible por el momento.' }
  if (limited(`demanda:${await ip()}`, 5, 15 * 60_000)) return { error: DEMASIADOS }
  const interes = String(fd.get('interes') ?? '').trim()
  const contacto = String(fd.get('contacto') ?? '').trim()
  if (!interes) return { error: 'Contanos qué curso te interesa.' }
  if (interes.length > 200 || contacto.length > 200) return { error: 'Alguno de los datos es demasiado largo.' }
  const sb = await createClient()
  const { error } = await sb.from('demanda_cursos').insert({ interes, contacto: contacto || null })
  return error ? { error: 'No pudimos registrar tu interés.' } : { ok: true }
}
