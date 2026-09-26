'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, ipDeLaRequest } from '@/lib/rate-limit'
import { safeNextPath, siteUrl } from '@/lib/site-url'

export type ActionState = { error?: string; success?: string }

const ROLE_HOME: Record<string, string> = {
  alumno: '/alumno',
  profesor: '/profesor',
  administrador: '/admin',
}

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Ingresá tu email').email('Email inválido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
  next: z.string().optional(),
})

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ip = await ipDeLaRequest()
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return { error: 'Demasiados intentos. Esperá un minuto y volvé a intentar.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error || !data.user) return { error: 'Email o contraseña incorrectos.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, cuenta_activa')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profile?.cuenta_activa) {
    await supabase.auth.signOut()
    return { error: 'Tu cuenta está desactivada. Contactá a la administración.' }
  }

  const home = ROLE_HOME[profile.rol] ?? '/alumno'
  // Allowlist: `next` solo se respeta si cae dentro del propio home del rol
  // (evita que el redirect post-login mande a un área de otro rol).
  const next = parsed.data.next && parsed.data.next.startsWith(home) ? safeNextPath(parsed.data.next) : home
  redirect(next)
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

const recuperarSolicitarSchema = z.object({
  email: z.string().trim().min(1).email('Email inválido'),
})

export async function recuperarSolicitarAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = recuperarSolicitarSchema.safeParse(Object.fromEntries(formData))
  // Mensaje genérico también en input inválido — no confirmamos formato válido de emails ajenos.
  const generic: ActionState = {
    success: 'Si el email existe en nuestra base, vas a recibir un link para restablecer tu contraseña.',
  }
  if (!parsed.success) return generic

  const ip = await ipDeLaRequest()
  if (!rateLimit(`recuperar:${ip}`, 5, 60_000)) {
    return { error: 'Demasiados intentos. Esperá un minuto y volvé a intentar.' }
  }

  const supabase = await createClient()
  // No exponer si el email existe o no (previene enumeración de usuarios) — el
  // resultado visible es siempre el mismo mensaje genérico.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent('/recuperar/nueva-clave')}`,
  })

  return generic
}

const nuevaClaveSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmar: z.string(),
  })
  .refine((d) => d.password === d.confirmar, { message: 'Las contraseñas no coinciden', path: ['confirmar'] })

export async function recuperarActualizarAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = nuevaClaveSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'El link venció o ya fue usado. Solicitá uno nuevo.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: 'No pudimos actualizar la contraseña. Probá de nuevo.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()
  redirect((profile?.rol && ROLE_HOME[profile.rol]) || '/alumno')
}
