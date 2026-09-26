import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Rol = 'alumno' | 'profesor' | 'administrador'

export type Profile = {
  id: string
  nombre: string
  apellido: string
  telefono: string | null
  email: string
  rol: Rol
  cuenta_activa: boolean
  created_at: string
}

const ROLE_HOME: Record<Rol, string> = {
  alumno: '/alumno',
  profesor: '/profesor',
  administrador: '/admin',
}

export function nombreCompleto(p: Pick<Profile, 'nombre' | 'apellido' | 'email'>): string {
  return `${p.nombre} ${p.apellido}`.trim() || p.email
}

export async function getUserAndProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>()

  return { user, profile }
}

async function requireRole(rol: Rol) {
  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) redirect('/login')
  if (profile.rol !== rol) redirect(ROLE_HOME[profile.rol])
  return { user, profile }
}

export const requireAlumno = () => requireRole('alumno')
export const requireProfesor = () => requireRole('profesor')
export const requireAdmin = () => requireRole('administrador')
