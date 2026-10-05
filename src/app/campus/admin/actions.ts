'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/supabase/env'
import { enviarMail } from '@/lib/mail'
import { DIAS } from '@/lib/types'
import { urlOpcional, extensionImagen, esUrlHttp } from '@/lib/validar'
import { hoyAR } from '@/lib/fechas'

export type R = { ok?: boolean; error?: string }
const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const num = (fd: FormData, k: string) => (txt(fd, k) === '' ? null : Number(txt(fd, k)))

function traducir(m: string) {
  if (/cupos disponibles/.test(m)) return 'El curso no tiene cupos disponibles.'
  if (/cupo no puede ser menor/.test(m)) return 'El cupo no puede ser menor que los alumnos ya asignados.'
  if (/Superposición/.test(m)) return 'Hay superposición de aula o profesor en ese día y horario.'
  if (/duplicate key|unique/.test(m)) return 'Ya existe un registro con esos datos.'
  if (/hora_fin|horarios_curso_check/.test(m)) return 'La hora de fin tiene que ser posterior a la de inicio.'
  if (/check constraint/.test(m)) return 'Algún valor está fuera de rango. Revisá los números ingresados.'
  if (/estado final/.test(m)) return 'Desertor es un estado final.'
  return 'No se pudo completar la operación.'
}
const fail = (e: { message: string } | null): R | null => (e ? { error: traducir(e.message) } : null)

// ── Usuarios ─────────────────────────────────────────────
// Solo el admin crea usuarios. Supabase genera el token (un solo uso, vence) y envía el mail.
export async function crearUsuario(_: R, fd: FormData): Promise<R> {
  const { perfil: yo, sb } = await requireRole('admin')
  const email = txt(fd, 'email').toLowerCase()
  const rol = txt(fd, 'rol')
  const nombre = txt(fd, 'nombre'), apellido = txt(fd, 'apellido')
  if (!['profesor', 'alumno'].includes(rol)) return { error: 'Rol inválido.' }
  if (!nombre || !apellido || !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Completá nombre, apellido y un email válido.' }

  const { data: existente } = await sb.from('profiles').select('id, rol').eq('email', email).maybeSingle()
  if (existente) return { error: 'Ese email ya existe. Para un alumno, usá "Agregar alumno" desde el curso.' }

  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
    data: { rol, nombre, apellido, telefono: txt(fd, 'telefono') || null },
    redirectTo: `${siteUrl}/auth/confirm`,
  })
  if (error) return { error: 'No se pudo enviar la invitación.' }
  await sb.from('audit_log').insert({ actor_id: yo.id, accion: 'invitar', entidad: 'profiles', detalle: { rol } })
  revalidatePath('/campus/admin/usuarios')
  return { ok: true }
}

export async function reenviarInvitacion(fd: FormData) {
  const { sb, perfil: yo } = await requireRole('admin')
  const { data: p } = await sb.from('profiles').select('email, estado_cuenta').eq('id', txt(fd, 'id')).single()
  if (!p || p.estado_cuenta !== 'pendiente_activacion') return
  // Un token nuevo invalida el anterior.
  await createAdminClient().auth.resetPasswordForEmail(p.email, { redirectTo: `${siteUrl}/auth/confirm` })
  await sb.from('audit_log').insert({ actor_id: yo.id, accion: 'reenviar_invitacion', entidad: 'profiles', entidad_id: txt(fd, 'id') })
}

export async function setEstadoCuenta(fd: FormData) {
  const { sb, perfil: yo } = await requireRole('admin')
  const id = txt(fd, 'id'), estado = txt(fd, 'estado')
  if (id === yo.id || !['activa', 'inactiva'].includes(estado)) return // el admin no se deshabilita a sí mismo
  const { error } = await sb.from('profiles').update({ estado_cuenta: estado }).eq('id', id)
  if (error) return
  // signOut() de admin espera el JWT del usuario, no su id: se revoca con un ban (invalida el refresh token).
  await createAdminClient().auth.admin
    .updateUserById(id, { ban_duration: estado === 'inactiva' ? '876000h' : 'none' })
    .catch(() => {})
  revalidatePath('/campus/admin/usuarios')
}

export async function cambiarEmail(_: R, fd: FormData): Promise<R> {
  const { sb, perfil: yo } = await requireRole('admin')
  const id = txt(fd, 'id'), email = txt(fd, 'email').toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Email inválido.' }
  const { error } = await createAdminClient().auth.admin.updateUserById(id, { email, email_confirm: false })
  if (error) return { error: 'No se pudo cambiar el email (¿ya está en uso?).' }
  await sb.from('profiles').update({ email }).eq('id', id)
  await sb.from('audit_log').insert({ actor_id: yo.id, accion: 'cambiar_email', entidad: 'profiles', entidad_id: id })
  revalidatePath('/campus/admin/usuarios')
  return { ok: true }
}

export async function actualizarPerfil(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const foto = urlOpcional(txt(fd, 'foto_url'))
  if (foto === undefined) return { error: 'La foto debe ser una URL http(s).' }
  const { error } = await sb.from('profiles').update({
    nombre: txt(fd, 'nombre'), apellido: txt(fd, 'apellido'), telefono: txt(fd, 'telefono') || null,
    experiencia: txt(fd, 'experiencia') || null, certificaciones: txt(fd, 'certificaciones') || null,
    foto_url: foto,
  }).eq('id', txt(fd, 'id'))
  revalidatePath('/campus/admin/usuarios')
  return fail(error) ?? { ok: true }
}

// ── Cursos ───────────────────────────────────────────────
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export async function guardarCurso(_: R, fd: FormData): Promise<R & { id?: string }> {
  const { sb } = await requireRole('admin')
  const id = txt(fd, 'id')
  const nombre = txt(fd, 'nombre')
  const cupo = num(fd, 'cupo')
  if (!nombre) return { error: 'Falta el nombre.' }
  if (!cupo || cupo <= 0) return { error: 'El cupo debe ser mayor a 0.' }
  const precio = num(fd, 'precio')
  const dur = num(fd, 'duracion_semanas'), desc = num(fd, 'descuento_pct')
  if (!Number.isInteger(cupo) || cupo < 1 || cupo > 500) return { error: 'El cupo debe ser un número entero entre 1 y 500.' }
  if (precio !== null && (!Number.isFinite(precio) || precio < 0)) return { error: 'El precio no puede ser negativo.' }
  if (desc !== null && !(desc >= 0 && desc <= 100)) return { error: 'El descuento debe estar entre 0 y 100%.' }
  if (dur !== null && !(Number.isInteger(dur) && dur >= 1 && dur <= 104)) return { error: 'La duración debe ser de 1 a 104 semanas.' }
  if (!['diseno', 'tecnico'].includes(txt(fd, 'area')) || !['curso', 'taller'].includes(txt(fd, 'tipo'))) return { error: 'Área o tipo inválidos.' }
  const imagen = urlOpcional(txt(fd, 'imagen_url')), video = urlOpcional(txt(fd, 'video_url'))
  if (imagen === undefined || video === undefined) return { error: 'La imagen y el video deben ser URLs http(s).' }
  const row = {
    nombre, slug: slugify(txt(fd, 'slug') || nombre),
    area: txt(fd, 'area'), tipo: txt(fd, 'tipo'), nivel: txt(fd, 'nivel') || null,
    descripcion: txt(fd, 'descripcion') || null, requisitos: txt(fd, 'requisitos') || null,
    imagen_url: imagen, video_url: video,
    duracion_semanas: dur, cupo, precio,
    descuento_pct: desc, fecha_inicio: txt(fd, 'fecha_inicio') || null,
    aula_id: txt(fd, 'aula_id') || null, profesor_id: txt(fd, 'profesor_id') || null,
    destacado: fd.get('destacado') === 'on', orden: num(fd, 'orden') ?? 0,
  } as Record<string, unknown>
  // La fecha «precios actualizados al…» de la ficha solo se mueve si el precio cambió de verdad.
  if (precio == null) row.precio_actualizado_en = null
  else if (!id) row.precio_actualizado_en = hoyAR()
  else {
    const { data: previo } = await sb.from('cursos').select('precio').eq('id', id).single()
    if (Number(previo?.precio) !== precio) row.precio_actualizado_en = hoyAR()
  }
  const q = id
    ? sb.from('cursos').update(row).eq('id', id).select('id').single()
    : sb.from('cursos').insert(row).select('id').single()
  const { data, error } = await q
  if (error) return { error: traducir(error.message) }
  revalidatePath('/campus/admin/cursos'); revalidatePath('/cursos')
  return { ok: true, id: data.id }
}

export async function bajaCurso(fd: FormData) {
  const { sb } = await requireRole('admin')
  await sb.from('cursos').update({ activo: false }).eq('id', txt(fd, 'id'))
  revalidatePath('/campus/admin/cursos'); revalidatePath('/cursos')
}

// Volver a publicar un curso dado de baja (la baja no toca las inscripciones, así que no hay nada más que revertir).
export async function reactivarCurso(fd: FormData) {
  const { sb } = await requireRole('admin')
  await sb.from('cursos').update({ activo: true }).eq('id', txt(fd, 'id'))
  revalidatePath('/campus/admin/cursos'); revalidatePath('/cursos')
}

// Horarios, uno por línea: "día hora-inicio-hora-fin", ej. "1 18:00-20:00". Valida choques (RF-17).
export async function guardarHorarios(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const curso_id = txt(fd, 'curso_id')
  const filas = txt(fd, 'horarios').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^([0-6])\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/)
    return m ? { curso_id, dia_semana: Number(m[1]), hora_inicio: m[2], hora_fin: m[3] } : null
  })
  if (filas.some((f) => !f)) return { error: `Formato: "día 18:00-20:00" (${DIAS.map((d, i) => `${i}=${d}`).join(', ')}).` }
  const { error } = await sb.rpc('reemplazar_filas_curso', { p_tabla: 'horarios_curso', p_curso: curso_id, p_filas: filas })
  if (error) return { error: traducir(error.message) }
  revalidatePath(`/campus/admin/cursos/${curso_id}`)
  return { ok: true }
}

// Temario público: "# Título del módulo" seguido de un ítem por línea.
export async function guardarModulos(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const curso_id = txt(fd, 'curso_id')
  const mods: { curso_id: string; orden: number; titulo: string; items: string[] }[] = []
  for (const l of txt(fd, 'modulos').split('\n').map((x) => x.trim()).filter(Boolean)) {
    if (l.startsWith('#')) mods.push({ curso_id, orden: mods.length, titulo: l.replace(/^#+\s*/, ''), items: [] })
    else mods.at(-1)?.items.push(l.replace(/^[-•]\s*/, ''))
  }
  const { error } = await sb.rpc('reemplazar_filas_curso', { p_tabla: 'modulos_curso', p_curso: curso_id, p_filas: mods })
  if (error) return { error: 'No se pudo guardar el temario.' }
  revalidatePath(`/campus/admin/cursos/${curso_id}`)
  return { ok: true }
}

// Calendario (RF-31): "N | AAAA-MM-DD | Título | estado(opcional)" por línea. Admin y profesor del curso (RLS).
export async function guardarClases(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin', 'profesor')
  const curso_id = txt(fd, 'curso_id')
  const filas = txt(fd, 'clases').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [n, fecha, titulo, estado] = l.split('|').map((x) => x.trim())
    if (!/^\d+$/.test(n) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '') || !titulo) return null
    if (estado && !['programada', 'suspendida', 'reprogramada'].includes(estado)) return null
    return { curso_id, numero: Number(n), fecha, titulo, estado: estado || 'programada' }
  })
  if (filas.some((f) => !f)) return { error: 'Formato por línea: "1 | 2026-10-05 | Título de la clase | programada".' }
  const ok = filas as { numero: number; estado: string; fecha: string }[]
  if (!ok.length) return { error: 'El calendario no puede quedar vacío.' }
  if (new Set(ok.map((f) => f.numero)).size !== ok.length) return { error: 'Hay números de clase repetidos.' }
  const nums = ok.map((f) => f.numero)

  // Lo que ya estaba: sirve para avisar solo los cambios y para no borrar clases con material.
  const { data: previas } = await sb.from('clases').select('id, numero, fecha, estado').eq('curso_id', curso_id)
  const aBorrar = (previas ?? []).filter((c: any) => !nums.includes(c.numero))
  if (aBorrar.length) {
    const { data: conMaterial } = await sb.from('materiales').select('clase_id').in('clase_id', aBorrar.map((c: any) => c.id)).limit(1)
    if (conMaterial?.length) return { error: 'Hay clases con material que no están en la lista. Dejalas en el calendario o pasá el material a "general".' }
  }

  const { error } = await sb.from('clases').upsert(ok as any[], { onConflict: 'curso_id,numero' })
  if (error) return { error: 'No se pudo guardar el calendario.' }
  if (aBorrar.length) {
    const { error: eDel } = await sb.from('clases').delete().in('id', aBorrar.map((c: any) => c.id))
    if (eDel) return { error: 'Se guardó el calendario, pero no se pudieron quitar las clases que faltaban.' }
  }

  // RF-38 (por mail): avisar a los alumnos activos de clases suspendidas/reprogramadas (solo lo que cambió).
  const previa = new Map((previas ?? []).map((c: any) => [c.numero, c]))
  const aviso = ok.filter((f) => f.estado !== 'programada' && (() => { const a: any = previa.get(f.numero); return !a || a.estado !== f.estado || a.fecha !== f.fecha })())
  if (aviso.length && fd.get('avisar') === 'on') {
    const { data: ins } = await sb.from('inscripciones').select('profiles!inscripciones_alumno_id_fkey(email)').eq('curso_id', curso_id).eq('estado', 'activo')
    const { data: c } = await sb.from('cursos').select('nombre').eq('id', curso_id).single()
    const to: string[] = (ins ?? []).map((i: any) => i.profiles?.email).filter(Boolean)
    // Un mail por alumno: en un único `to` cada uno vería el email de sus compañeros.
    const texto = aviso.map((a) => `Clase ${a.numero} (${a.fecha}): ${a.estado}`).join('\n') + '\n\nRecovery Parts'
    const envios = await Promise.all(to.map((t) => enviarMail(t, `Cambios en las clases de ${c?.nombre}`, texto)))
    if (to.length && envios.some((e) => !e)) {
      revalidatePath(`/campus/admin/cursos/${curso_id}`); revalidatePath(`/campus/profesor/curso/${curso_id}`)
      return { error: 'El calendario se guardó, pero no se pudo enviar el aviso por mail a todos los alumnos.' }
    }
  }
  revalidatePath(`/campus/admin/cursos/${curso_id}`); revalidatePath(`/campus/profesor/curso/${curso_id}`)
  return { ok: true }
}

// Kit informativo (RF-45/46): "Nombre | Descripción | Precio | https://link" por línea.
export async function guardarKit(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const curso_id = txt(fd, 'curso_id')
  const filas = txt(fd, 'kit').split('\n').map((l) => l.trim()).filter(Boolean).map((l, orden) => {
    const [nombre, descripcion, precio, link, tipo] = l.split('|').map((x) => x.trim())
    if (!nombre || (precio && (isNaN(Number(precio)) || Number(precio) < 0)) || (link && !esUrlHttp(link))) return null
    // `tipo` es opcional (kits viejos de 4 columnas): sin tipo, el ítem se considera necesario.
    return { curso_id, orden, nombre, descripcion: descripcion || null, precio: precio ? Number(precio) : null, link_externo: link || null, requerido: tipo !== 'recomendado' }
  })
  if (filas.some((f) => !f)) return { error: 'Revisá el kit: cada ítem necesita nombre, el precio no puede ser negativo y el link debe empezar con http(s)://.' }
  const { error } = await sb.rpc('reemplazar_filas_curso', { p_tabla: 'kit_items', p_curso: curso_id, p_filas: filas })
  if (error) return { error: 'No se pudo guardar el kit.' }
  await sb.from('cursos').update({ precio_actualizado_en: hoyAR() }).eq('id', curso_id)
  revalidatePath(`/campus/admin/cursos/${curso_id}`)
  return { ok: true }
}

// ── Alumnos en el curso ──────────────────────────────────
// Si el alumno ya existe se vincula y se avisa por mail (sin token); si no, se invita.
export async function agregarAlumno(_: R, fd: FormData): Promise<R> {
  const { sb, perfil: yo } = await requireRole('admin')
  const curso_id = txt(fd, 'curso_id')
  const email = txt(fd, 'email').toLowerCase()
  const { data: curso } = await sb.from('cursos').select('nombre, cupo, activo').eq('id', curso_id).single()
  if (!curso || !curso.activo) return { error: 'Curso inexistente o dado de baja.' }
  // Se valida antes de invitar: si no, el alumno recibe un mail de una cuenta que se borra enseguida.
  const { count: ocupados } = await sb.from('inscripciones').select('id', { count: 'exact', head: true }).eq('curso_id', curso_id)
  if ((ocupados ?? 0) >= curso.cupo) return { error: 'El curso no tiene cupos disponibles.' }

  let { data: alumno } = await sb.from('profiles').select('id, rol, nombre').eq('email', email).maybeSingle()
  let nuevo = false
  if (alumno && alumno.rol !== 'alumno') return { error: 'Ese email pertenece a un profesor o admin.' }

  if (!alumno) {
    const nombre = txt(fd, 'nombre'), apellido = txt(fd, 'apellido')
    if (!nombre || !apellido || !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Alumno nuevo: completá nombre, apellido y un email válido.' }
    const { data, error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
      data: { rol: 'alumno', nombre, apellido, telefono: txt(fd, 'telefono') || null },
      redirectTo: `${siteUrl}/auth/confirm`,
    })
    if (error || !data.user) return { error: 'No se pudo enviar la invitación.' }
    alumno = { id: data.user.id, rol: 'alumno', nombre }
    nuevo = true
  }

  const { error } = await sb.from('inscripciones').insert({ alumno_id: alumno.id, curso_id })
  if (error) {
    if (nuevo) await createAdminClient().auth.admin.deleteUser(alumno.id).catch(() => {}) // sin cuentas huérfanas
    return { error: /duplicate|unique/.test(error.message) ? 'El alumno ya está en este curso.' : traducir(error.message) }
  }
  if (!nuevo) await enviarMail(email, `Te sumaron al curso ${curso.nombre} — Recovery Parts`, `Hola ${alumno.nombre}, fuiste agregado al curso ${curso.nombre}. Ingresá al Campus con tu cuenta de siempre.`)
  await sb.from('audit_log').insert({ actor_id: yo.id, accion: 'añadir_alumno', entidad: 'inscripciones', detalle: { curso_id } })
  revalidatePath(`/campus/admin/cursos/${curso_id}`)
  return { ok: true }
}

// RF-15/54/55: Desertor = estado final, con fecha y motivo obligatorio. Nunca se borra.
export async function marcarDesertor(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const motivo = txt(fd, 'motivo'), fecha = txt(fd, 'fecha') || hoyAR()
  if (!motivo) return { error: 'El motivo es obligatorio.' }
  const { data, error } = await sb.from('inscripciones')
    .update({ estado: 'desertor', fecha_desercion: fecha, motivo_desercion: motivo })
    .eq('id', txt(fd, 'id')).neq('estado', 'desertor').select('id')
  if (error) return { error: traducir(error.message) }
  if (!data?.length) return { error: 'No se encontró la inscripción o el alumno ya figura como desertor.' }
  revalidatePath(`/campus/admin/cursos/${txt(fd, 'curso_id')}`)
  return { ok: true }
}

// Corregir la fecha recalcula el N° de clase (lo hace el trigger de la base).
export async function corregirFechaDesercion(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(txt(fd, 'fecha'))) return { error: 'Poné una fecha válida.' }
  const { data, error } = await sb.from('inscripciones').update({ fecha_desercion: txt(fd, 'fecha') }).eq('id', txt(fd, 'id')).eq('estado', 'desertor').select('id')
  if (!error && !data?.length) return { error: 'No se encontró un desertor con ese id.' }
  revalidatePath(`/campus/admin/cursos/${txt(fd, 'curso_id')}`)
  return fail(error) ?? { ok: true }
}

// RF-14 (🟡): al terminar, los alumnos activos pasan a "finalizado" (habilita el ZIP, RF-35).
export async function finalizarCurso(fd: FormData) {
  const { sb } = await requireRole('admin')
  const id = txt(fd, 'id')
  await sb.from('inscripciones').update({ estado: 'finalizado' }).eq('curso_id', id).eq('estado', 'activo')
  revalidatePath(`/campus/admin/cursos/${id}`)
}

// ── Encuestas (RF-47) ────────────────────────────────────
// Preguntas, una por línea: "puntaje | ¿Texto?" o "texto | ¿Texto?".
export async function guardarEncuesta(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const preguntas = txt(fd, 'preguntas').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [tipo, ...resto] = l.split('|')
    return resto.length
      ? { tipo: tipo.trim() === 'texto' ? 'texto' : 'puntaje', texto: resto.join('|').trim() }
      : { tipo: 'puntaje', texto: l }
  })
  if (!txt(fd, 'titulo') || !preguntas.length) return { error: 'Poné un título y al menos una pregunta.' }
  if (!txt(fd, 'curso_id')) return { error: 'Elegí el curso: sin curso ningún alumno vería la encuesta.' }
  const row = { titulo: txt(fd, 'titulo'), curso_id: txt(fd, 'curso_id'), preguntas, activa: fd.get('activa') === 'on' }
  const id = txt(fd, 'id')
  if (id) {
    // Las respuestas se guardan por N° de pregunta: cambiar las preguntas con respuestas las desalinearía.
    const { data: previa } = await sb.from('encuestas').select('preguntas').eq('id', id).single()
    const { count } = await sb.from('encuesta_respuestas').select('id', { count: 'exact', head: true }).eq('encuesta_id', id)
    if ((count ?? 0) > 0 && JSON.stringify(previa?.preguntas) !== JSON.stringify(preguntas))
      return { error: 'Esta encuesta ya tiene respuestas: no se pueden cambiar las preguntas. Creá una encuesta nueva.' }
  }
  const { error } = id ? await sb.from('encuestas').update(row).eq('id', id) : await sb.from('encuestas').insert(row)
  revalidatePath('/campus/admin/encuestas')
  return fail(error) ?? { ok: true }
}

// ── CMS del sitio (RF-53) ────────────────────────────────
// Los campos llegan como rutas "grupo.campo" (ej. areas.diseno.titulo) y se anidan en el JSON.
export async function guardarSetting(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const clave = txt(fd, 'clave')
  const valor: Record<string, any> = {}
  for (const [k, v] of fd.entries()) {
    if (k === 'clave' || typeof v !== 'string') continue
    const path = k.split('.')
    if (path.some((p) => ['__proto__', 'constructor', 'prototype'].includes(p))) continue
    let o = valor
    path.slice(0, -1).forEach((p) => (o = o[p] ??= {}))
    const val = v.trim()
    const last = path.at(-1)!
    if (['aulas', 'profesores', 'egresados'].includes(last)) { o[last] = /^\d+$/.test(val) ? Number(val) : null; continue } // vacío = null (se oculta en la home)
    o[last] = val
  }
  // Se mezcla con lo guardado: el formulario puede no traer todas las claves y no hay que perderlas.
  const { data: actual } = await sb.from('site_settings').select('valor').eq('clave', clave).maybeSingle()
  const mezclar = (a: any, b: any): any => (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(b))
    ? Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, k in b ? mezclar(a[k], b[k]) : a[k]]))
    : b
  const { error } = await sb.from('site_settings').upsert({ clave, valor: mezclar(actual?.valor ?? {}, valor) })
  revalidatePath('/', 'layout')
  return fail(error) ?? { ok: true }
}

const TABLAS_CMS = { egresado: 'cms_egresados', testimonio: 'cms_testimonios', faq: 'cms_faq', foto: 'cms_galeria' } as const
export async function guardarItemCms(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const tipo = txt(fd, 'tipo') as keyof typeof TABLAS_CMS
  const tabla = TABLAS_CMS[tipo]
  if (!tabla) return { error: 'Tipo inválido.' }
  const orden = num(fd, 'orden') ?? 0
  const foto = urlOpcional(txt(fd, 'foto_url')), imagen = urlOpcional(txt(fd, 'imagen_url'))
  if (foto === undefined || imagen === undefined) return { error: 'Las imágenes deben ser URLs http(s).' }
  const rows: Record<string, unknown> = {
    egresado: { nombre: txt(fd, 'nombre'), especialidad: txt(fd, 'especialidad'), foto_url: foto, destacado: fd.get('destacado') === 'on', orden },
    testimonio: { nombre: txt(fd, 'nombre'), curso: txt(fd, 'curso') || null, texto: txt(fd, 'texto'), puntaje: num(fd, 'puntaje') ?? 5, foto_url: foto, curso_id: txt(fd, 'curso_id') || null, orden },
    faq: { pregunta: txt(fd, 'pregunta'), respuesta: txt(fd, 'respuesta'), orden },
    foto: { categoria: txt(fd, 'categoria'), area: txt(fd, 'area') || null, imagen_url: imagen ?? '', alt: txt(fd, 'alt'), descripcion: txt(fd, 'descripcion') || null, orden },
  }[tipo]
  const id = txt(fd, 'id')
  const { error } = id ? await sb.from(tabla).update(rows).eq('id', id) : await sb.from(tabla).insert(rows)
  revalidatePath('/', 'layout')
  return fail(error) ?? { ok: true }
}

export async function borrarItemCms(fd: FormData) {
  const { sb } = await requireRole('admin')
  const tabla = TABLAS_CMS[txt(fd, 'tipo') as keyof typeof TABLAS_CMS]
  if (tabla) await sb.from(tabla).delete().eq('id', txt(fd, 'id'))
  revalidatePath('/', 'layout')
}

export async function marcarContactoLeido(fd: FormData) {
  const { sb } = await requireRole('admin')
  await sb.from('contactos').update({ leido: fd.get('leido') === '1' }).eq('id', txt(fd, 'id'))
  revalidatePath('/campus/admin/consultas')
}

// Sube una imagen al bucket público del CMS y devuelve la URL (para pegar en los campos de imagen).
export async function subirImagen(_: { url?: string; error?: string }, fd: FormData): Promise<{ url?: string; error?: string }> {
  const { sb } = await requireRole('admin')
  const f = fd.get('archivo') as File | null
  if (!f || !f.size) return { error: 'Elegí una imagen.' }
  if (!['image/webp', 'image/jpeg', 'image/png', 'image/avif'].includes(f.type) || f.size > 8 * 1024 * 1024) return { error: 'Solo WebP/JPG/PNG/AVIF de hasta 8 MB.' }
  // El `type` lo manda el cliente: se confirma con la firma real del archivo.
  const ext = extensionImagen(new Uint8Array(await f.slice(0, 12).arrayBuffer()))
  if (!ext) return { error: 'El archivo no es una imagen válida.' }
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await sb.storage.from('sitio').upload(path, f, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` })
  if (error) return { error: 'No se pudo subir la imagen.' }
  return { url: sb.storage.from('sitio').getPublicUrl(path).data.publicUrl }
}
