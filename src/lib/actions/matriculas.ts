'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin, getUserAndProfile } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/site-url'
import { enviarCursoAsignado } from '@/lib/mail'
import type { ActionState } from '@/lib/actions/auth'

const agregarSchema = z.object({
  curso_id: z.coerce.number().int().positive(),
  email: z.string().trim().min(1).email('Email inválido'),
  nombre: z.string().trim().min(1, 'Ingresá un nombre').max(120),
  apellido: z.string().trim().min(1, 'Ingresá un apellido').max(120),
  telefono: z.string().trim().max(40).optional(),
})

// RF-12/RF-13: si el alumno ya existe (compró otro curso), se reutiliza y solo
// se lo vincula al curso nuevo — no se crea de nuevo ni se le manda invitación.
export async function agregarAlumnoACursoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = agregarSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data
  const email = d.email.toLowerCase()

  const supabase = await createClient()

  const { data: curso } = await supabase.from('cursos').select('id, titulo, cupo_total').eq('id', d.curso_id).maybeSingle()
  if (!curso) return { error: 'Curso no encontrado' }

  const { count: matriculados } = await supabase
    .from('matriculas')
    .select('*', { count: 'exact', head: true })
    .eq('curso_id', d.curso_id)
    .eq('estado', 'activo')
  if ((matriculados ?? 0) >= curso.cupo_total) return { error: 'No quedan cupos disponibles en este curso.' }

  const { data: existente } = await supabase.from('profiles').select('id, rol').eq('email', email).maybeSingle()

  let alumnoId: string

  if (existente) {
    if (existente.rol !== 'alumno') return { error: 'Ese email ya tiene una cuenta con otro rol (profesor/admin).' }
    alumnoId = existente.id

    const { data: yaMatriculado } = await supabase
      .from('matriculas')
      .select('id')
      .eq('alumno_id', alumnoId)
      .eq('curso_id', d.curso_id)
      .maybeSingle()
    if (yaMatriculado) return { error: 'Ese alumno ya está matriculado en este curso.' }

    await enviarCursoAsignado(email, d.nombre, curso.titulo)
  } else {
    const admin = createAdminClient()
    const { data: invitado, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { rol: 'alumno', nombre: d.nombre, apellido: d.apellido, telefono: d.telefono || null },
      redirectTo: `${siteUrl()}/activar`,
    })
    if (inviteError || !invitado.user) return { error: 'No pudimos invitar al alumno. Probá de nuevo.' }
    alumnoId = invitado.user.id
  }

  const { error: matriculaError } = await supabase.from('matriculas').insert({ alumno_id: alumnoId, curso_id: d.curso_id })
  if (matriculaError) return { error: 'No pudimos matricular al alumno. Probá de nuevo.' }

  revalidatePath(`/admin/cursos/${d.curso_id}`)
  return { success: `${d.nombre} matriculado correctamente.` }
}

const estadoSchema = z.object({
  matricula_id: z.coerce.number().int().positive(),
  curso_id: z.coerce.number().int().positive(),
  estado: z.enum(['activo', 'suspendido', 'desertor', 'inactivo']),
  motivo_baja: z.string().trim().max(500).optional(),
  fecha_desercion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// RF-15/RF-54/RF-55: cambia el estado de una matrícula. Motivo obligatorio
// para desertor/inactivo. n_clase_desercion se calcula server-side contando
// solo clases 'programada' (no suspendidas/reprogramadas, RF-38) hasta la fecha.
export async function cambiarEstadoMatriculaAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  // No usamos requireProfesor()/requireAdmin() acá: esta acción la puede
  // llamar CUALQUIERA de los dos roles (con distinto alcance), y esos
  // helpers redirigen en vez de devolver un error al form.
  const { user, profile } = await getUserAndProfile()
  if (!user || !profile || (profile.rol !== 'profesor' && profile.rol !== 'administrador')) {
    return { error: 'No autorizado.' }
  }

  const parsed = estadoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  if ((d.estado === 'desertor' || d.estado === 'inactivo') && !d.motivo_baja) {
    return { error: 'El motivo es obligatorio para dar de baja o marcar deserción.' }
  }

  const supabase = await createClient()

  // Un profesor solo puede marcar deserción en SUS propios cursos (RF-15).
  // Reactivar (RF-56), suspender o inactivar quedan como acción del Admin.
  if (profile.rol === 'profesor') {
    if (d.estado !== 'desertor') return { error: 'Solo un Administrador puede hacer ese cambio.' }
    const { data: curso } = await supabase.from('cursos').select('profesor_id').eq('id', d.curso_id).maybeSingle()
    if (curso?.profesor_id !== user.id) return { error: 'No sos el profesor de este curso.' }
  }

  const fechaDesercion = d.fecha_desercion || new Date().toISOString().slice(0, 10)

  const update: Record<string, unknown> = {
    estado: d.estado,
    marcado_por: profile.id,
    marcado_en: new Date().toISOString(),
  }

  if (d.estado === 'desertor') {
    const { count } = await supabase
      .from('clases')
      .select('*', { count: 'exact', head: true })
      .eq('curso_id', d.curso_id)
      .eq('estado', 'programada')
      .lte('fecha', fechaDesercion)
    update.motivo_baja = d.motivo_baja
    update.fecha_desercion = fechaDesercion
    update.n_clase_desercion = count ?? 0
  } else if (d.estado === 'inactivo') {
    update.motivo_baja = d.motivo_baja
  } else {
    // activo/suspendido: limpiar el rastro de una deserción previa (RF-56 — reactivación).
    update.motivo_baja = null
    update.fecha_desercion = null
    update.n_clase_desercion = null
  }

  const { error } = await supabase.from('matriculas').update(update).eq('id', d.matricula_id)
  if (error) return { error: 'No pudimos actualizar el estado.' }

  revalidatePath(`/admin/cursos/${d.curso_id}`)
  return { success: 'Estado actualizado.' }
}
