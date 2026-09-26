'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/site-url'
import type { ActionState } from '@/lib/actions/auth'

const invitarSchema = z.object({
  email: z.string().trim().min(1, 'Ingresá un email').email('Email inválido'),
  nombre: z.string().trim().min(1, 'Ingresá un nombre').max(120),
  apellido: z.string().trim().min(1, 'Ingresá un apellido').max(120),
  telefono: z.string().trim().max(40).optional(),
  rol: z.enum(['alumno', 'profesor'], { message: 'Rol inválido' }),
})

export async function invitarUsuarioAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  // Revalidación server-side: nunca confiar en que el form solo lo vea un admin.
  await requireAdmin()

  const parsed = invitarSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: {
      rol: parsed.data.rol,
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido,
      telefono: parsed.data.telefono || null,
    },
    redirectTo: `${siteUrl()}/activar`,
  })

  if (error) {
    if (error.message.toLowerCase().includes('already been registered')) {
      return { error: 'Ese email ya tiene una cuenta.' }
    }
    return { error: 'No pudimos enviar la invitación. Probá de nuevo.' }
  }

  revalidatePath('/admin/usuarios')
  return { success: `Invitación enviada a ${parsed.data.email}.` }
}

// RF-56: reactivación manual de cuenta por el Admin. El trigger
// profiles_block_privilege_self_update (0001) ya impide que un no-admin toque
// esta columna sobre sí mismo — acá solo falta la acción del lado admin.
export async function toggleCuentaActivaAction(profileId: string, activar: boolean) {
  const { profile: admin } = await requireAdmin()
  if (profileId === admin.id) return // no desactivarse a sí mismo por error de UI

  const supabase = await createClient()
  await supabase.from('profiles').update({ cuenta_activa: activar }).eq('id', profileId)
  revalidatePath('/admin/usuarios')
}
