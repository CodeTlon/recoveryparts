'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, ipDeLaRequest } from '@/lib/rate-limit'
import { enviarContactoRecibido } from '@/lib/mail'
import type { ActionState } from '@/lib/actions/auth'

const contactoSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá tu nombre').max(120),
  email: z.string().trim().min(1, 'Ingresá tu email').email('Email inválido'),
  telefono: z.string().trim().max(40).optional(),
  mensaje: z.string().trim().min(5, 'Contanos un poco más').max(2000),
  // Honeypot: campo invisible para humanos vía CSS — un bot que autocompleta
  // todos los inputs del form lo llena, un visitante real nunca lo toca.
  sitio_web: z.string().optional(),
})

export async function enviarConsultaAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = contactoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revisá los datos' }
  // Honeypot lleno → bot. Éxito falso: no se guarda ni se manda nada, pero el bot no lo sabe.
  if (parsed.data.sitio_web) return { success: '¡Gracias! Te vamos a contactar a la brevedad.' }

  const ip = await ipDeLaRequest()
  if (!rateLimit(`contacto:${ip}`, 5, 60 * 60_000)) {
    return { error: 'Demasiadas consultas desde tu conexión. Probá más tarde o escribinos por WhatsApp.' }
  }

  const { nombre, email, telefono, mensaje } = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.from('contactos').insert({ nombre, email, telefono: telefono || null, mensaje })
  if (error) return { error: 'No pudimos enviar tu consulta. Probá de nuevo.' }

  await enviarContactoRecibido({ nombre, email, telefono, mensaje })
  return { success: '¡Gracias! Te vamos a contactar a la brevedad.' }
}
