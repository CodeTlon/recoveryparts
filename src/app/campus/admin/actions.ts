'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/supabase/env'
import { enviarMail } from '@/lib/mail'
import { DIAS } from '@/lib/types'
import { urlOpcional, imagenOpcional, extensionImagen, esUrlHttp } from '@/lib/validar'
import { hoyAR } from '@/lib/fechas'

export type R = { ok?: boolean; error?: string }
const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const num = (fd: FormData, k: string) => (txt(fd, k) === '' ? null : Number(txt(fd, k)))

function traducir(m: string) {
  // Reglas de aulas (0010): los mensajes de la base ya son legibles y nombran los cursos afectados.
  if (/^(Cargá la capacidad|La capacidad del aula|No se puede dar de baja el aula|El aula .+ está dada de baja|El cupo \(\d+\) supera|Las aulas no se borran)/.test(m)) return m
  if (/aulas_nombre/.test(m)) return 'Ya existe un aula con ese nombre.'
  // Ediciones (0011): mensajes legibles de la base (superposición, fechas, plan de clases, curso de baja).
  if (/^(Se superpone con la edición|El curso está dado de baja|Cargá la fecha de inicio|La clase \d+ |El material no pertenece|El aula .+ de la edición)/.test(m)) return m
  if (/ediciones_cupo_check/.test(m)) return 'El cupo debe ser un número entero entre 1 y 500.'
  // Estructura del curso (0013): módulo vacío, clase sin módulo, taller con módulos, clase con fechas.
  if (/^(La clase «|El módulo «|Un taller no lleva|Las clases de cada módulo|El plan admite|No tenés permiso para editar)/.test(m)) return m
  if (/modulos_curso_titulo_check/.test(m)) return 'Cada módulo necesita un título de hasta 120 caracteres.'
  if (/plan_clases_titulo_check|plan_clases_numero_check/.test(m)) return 'Revisá el plan: cada clase necesita un título de hasta 200 caracteres.'
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
  const foto = imagenOpcional(txt(fd, 'foto_url'))
  if (foto === undefined) return { error: 'La foto debe ser una URL http(s) o una ruta del sitio (/images/…).' }
  const { error } = await sb.from('profiles').update({
    nombre: txt(fd, 'nombre'), apellido: txt(fd, 'apellido'), telefono: txt(fd, 'telefono') || null,
    experiencia: txt(fd, 'experiencia') || null, certificaciones: txt(fd, 'certificaciones') || null,
    foto_url: foto,
  }).eq('id', txt(fd, 'id'))
  revalidatePath('/campus/admin/usuarios')
  return fail(error) ?? { ok: true }
}

// ── Cursos (catálogo) ────────────────────────────────────
// El curso es el contenido que se carga una vez; cada vez que se dicta es una edición (ver más abajo).
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const fechaValida = (f: string) => FECHA.test(f) && !Number.isNaN(Date.parse(`${f}T12:00:00Z`)) && new Date(`${f}T12:00:00Z`).toISOString().slice(0, 10) === f
// Las relaciones muchos-a-uno (edición → curso) llegan como objeto; el tipo inferido es una lista.
const uno = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)
const revalidarCursos = () => { revalidatePath('/campus', 'layout'); revalidatePath('/cursos', 'layout'); revalidatePath('/') }

export async function guardarCurso(_: R, fd: FormData): Promise<R & { id?: string }> {
  const { sb } = await requireRole('admin')
  const id = txt(fd, 'id')
  const nombre = txt(fd, 'nombre')
  if (!nombre || nombre.length > 120) return { error: 'Poné un nombre de hasta 120 caracteres.' }
  const precio = num(fd, 'precio')
  const dur = num(fd, 'duracion_semanas'), desc = num(fd, 'descuento_pct'), orden = num(fd, 'orden') ?? 0
  if (precio !== null && (!Number.isFinite(precio) || precio < 0 || precio > 100_000_000)) return { error: 'El precio tiene que ser un número entre 0 y 100.000.000.' }
  if (desc !== null && !(Number.isFinite(desc) && desc >= 0 && desc <= 100)) return { error: 'El descuento debe estar entre 0 y 100%.' }
  if (dur !== null && !(Number.isInteger(dur) && dur >= 1 && dur <= 104)) return { error: 'La duración debe ser de 1 a 104 semanas.' }
  if (!(Number.isInteger(orden) && orden >= 0 && orden <= 9999)) return { error: 'El orden debe ser un número entero entre 0 y 9999.' }
  if (!['diseno', 'tecnico'].includes(txt(fd, 'area')) || !['curso', 'taller'].includes(txt(fd, 'tipo'))) return { error: 'Área o tipo inválidos.' }
  const imagen = imagenOpcional(txt(fd, 'imagen_url')), video = urlOpcional(txt(fd, 'video_url'))
  if (imagen === undefined) return { error: 'La imagen debe ser una URL http(s) o una ruta del sitio (/images/…).' }
  if (video === undefined) return { error: 'El video debe ser un link http(s).' }
  const row = {
    nombre, slug: slugify(txt(fd, 'slug') || nombre),
    area: txt(fd, 'area'), tipo: txt(fd, 'tipo'), nivel: txt(fd, 'nivel') || null,
    descripcion: txt(fd, 'descripcion') || null, requisitos: txt(fd, 'requisitos') || null,
    imagen_url: imagen, video_url: video,
    duracion_semanas: dur, precio, descuento_pct: desc,
    destacado: fd.get('destacado') === 'on', orden,
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
  revalidarCursos()
  return { ok: true, id: data.id }
}

export async function bajaCurso(fd: FormData) {
  const { sb } = await requireRole('admin')
  await sb.from('cursos').update({ activo: false }).eq('id', txt(fd, 'id'))
  revalidarCursos()
}

// Volver a publicar un curso dado de baja. La base revalida sus ediciones activas (aula activa, cupo ≤ capacidad,
// choques de aula/profesor) y devuelve el motivo si algo cambió mientras estuvo de baja.
export async function reactivarCurso(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const { error } = await sb.from('cursos').update({ activo: true }).eq('id', txt(fd, 'id'))
  if (error) return { error: traducir(error.message) }
  revalidarCursos()
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
  const { error } = await sb.rpc('reemplazar_filas_curso', { p_tabla: 'modulos_curso', p_id: curso_id, p_filas: mods })
  if (error) return { error: 'No se pudo guardar el temario.' }
  revalidarCursos()
  return { ok: true }
}

// Plan de clases del curso (RF-31): "N | Título" por línea. Los títulos son los mismos en todas las ediciones;
// cada edición pone sus fechas. Lo edita el admin o un profesor que dicte una edición activa del curso (RLS).
export async function guardarPlanClases(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin', 'profesor')
  const curso_id = txt(fd, 'curso_id')
  const filas = txt(fd, 'plan').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [n, ...resto] = l.split('|'); const titulo = resto.join('|').trim()
    return /^\d+$/.test(n.trim()) && titulo && titulo.length <= 200 ? { curso_id, numero: Number(n), titulo } : null
  })
  if (filas.some((f) => !f)) return { error: 'Cada clase necesita un título de hasta 200 caracteres.' }
  const ok = filas as { numero: number }[]
  if (ok.length > 500) return { error: 'El plan admite hasta 500 clases.' }
  if (new Set(ok.map((f) => f.numero)).size !== ok.length) return { error: 'Hay números de clase repetidos.' }
  // No dejar fuera del plan clases que ya están en el calendario de alguna edición o que tienen material.
  const max = Math.max(0, ...ok.map((f) => f.numero))
  const { data: eds } = await sb.from('ediciones').select('id').eq('curso_id', curso_id)
  const { data: enUso } = eds?.length ? await sb.from('clases').select('numero').in('edicion_id', eds.map((e) => e.id)).gt('numero', max).limit(1) : { data: [] }
  if (enUso?.length) return { error: `La clase ${enUso[0].numero} está en el calendario de una edición. Sacala del calendario antes de quitarla del plan.` }
  const { data: conMat } = await sb.from('materiales').select('clase_numero').eq('curso_id', curso_id).gt('clase_numero', max).limit(1)
  if (conMat?.length) return { error: `La clase ${conMat[0].clase_numero} tiene material. Pasá ese material a otra clase o a «general» antes de quitarla.` }
  const { error } = await sb.rpc('reemplazar_filas_curso', { p_tabla: 'plan_clases', p_id: curso_id, p_filas: ok })
  if (error) return { error: traducir(error.message) }
  revalidarCursos()
  return { ok: true }
}

// Estructura del curso (RF-26, RF-31): módulos con sus clases (teóricas o prácticas); en talleres, solo clases.
// Llega como JSON del EstructuraEditor. La base guarda todo de una vez y valida la regla de estructura
// (sin clases sueltas ni módulos vacíos en cursos; sin módulos en talleres). Admin o profesor de una edición activa.
type EstructuraIn = { modulos: { id?: string; titulo: string }[]; clases: { id?: string; titulo: string; tipo: string; modulo: number | null }[] }
export async function guardarEstructura(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin', 'profesor')
  const curso_id = txt(fd, 'curso_id')
  let e: EstructuraIn
  try { e = JSON.parse(txt(fd, 'estructura')) } catch { return { error: 'No se pudo leer la estructura.' } }
  if (!Array.isArray(e?.modulos) || !Array.isArray(e?.clases)) return { error: 'No se pudo leer la estructura.' }
  if (e.modulos.some((m) => !m.titulo?.trim() || m.titulo.trim().length > 120)) return { error: 'Cada módulo necesita un título de hasta 120 caracteres.' }
  if (e.clases.some((c) => !c.titulo?.trim() || c.titulo.trim().length > 200)) return { error: 'Cada clase necesita un título de hasta 200 caracteres.' }
  if (e.clases.some((c) => !['teorica', 'practica'].includes(c.tipo))) return { error: 'Cada clase es teórica o práctica.' }
  if (e.clases.length > 500) return { error: 'El plan admite hasta 500 clases.' }
  const { error } = await sb.rpc('guardar_estructura', {
    p_curso: curso_id,
    p_modulos: e.modulos.map((m) => ({ id: m.id ?? null, titulo: m.titulo.trim() })),
    p_clases: e.clases.map((c) => ({ id: c.id ?? null, titulo: c.titulo.trim(), tipo: c.tipo, modulo: c.modulo })),
  })
  if (error) return { error: traducir(error.message) }
  revalidarCursos()
  return { ok: true }
}

// Kit informativo (RF-45/46): "Nombre | Descripción | Precio | https://link | tipo" por línea.
export async function guardarKit(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const curso_id = txt(fd, 'curso_id')
  const filas = txt(fd, 'kit').split('\n').map((l) => l.trim()).filter(Boolean).map((l, orden) => {
    const [nombre, descripcion, precio, link, tipo] = l.split('|').map((x) => x.trim())
    if (!nombre || (precio && (isNaN(Number(precio)) || Number(precio) < 0 || Number(precio) > 100_000_000)) || (link && !esUrlHttp(link))) return null
    // `tipo` es opcional (kits viejos de 4 columnas): sin tipo, el ítem se considera necesario.
    return { curso_id, orden, nombre, descripcion: descripcion || null, precio: precio ? Number(precio) : null, link_externo: link || null, requerido: tipo !== 'recomendado' }
  })
  if (filas.some((f) => !f)) return { error: 'Revisá el kit: cada ítem necesita nombre, el precio no puede ser negativo y el link debe empezar con http(s)://.' }
  const { error } = await sb.rpc('reemplazar_filas_curso', { p_tabla: 'kit_items', p_id: curso_id, p_filas: filas })
  if (error) return { error: 'No se pudo guardar el kit.' }
  await sb.from('cursos').update({ precio_actualizado_en: hoyAR() }).eq('id', curso_id)
  revalidarCursos()
  return { ok: true }
}

// ── Aulas (RF-03) ────────────────────────────────────────
// Catálogo propio: la capacidad es el techo físico y el cupo de cada curso nunca la supera.
// Las reglas (capacidad obligatoria al crear, cupo ≤ capacidad, sin baja con cursos activos, sin borrado) las valida la base.
export async function guardarAula(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const id = txt(fd, 'id')
  const nombre = txt(fd, 'nombre').replace(/\s+/g, ' ')
  const capacidad = num(fd, 'capacidad')
  if (!nombre || nombre.length > 60) return { error: 'Poné un nombre de hasta 60 caracteres.' }
  // Vacía solo al editar un aula que todavía no la tenía cargada (la base impide vaciar una cargada).
  if (capacidad === null ? !id : !(Number.isInteger(capacidad) && capacidad >= 1 && capacidad <= 500))
    return { error: 'La capacidad debe ser un número entero entre 1 y 500.' }
  const row = { nombre, capacidad }
  const { error } = id ? await sb.from('aulas').update(row).eq('id', id) : await sb.from('aulas').insert(row)
  if (error) return { error: traducir(error.message) }
  // El nombre del aula se muestra en el campus y en la ficha pública de los cursos.
  revalidatePath('/campus/admin', 'layout'); revalidatePath('/cursos', 'layout')
  return { ok: true }
}

export async function setEstadoAula(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const { error } = await sb.from('aulas').update({ activa: txt(fd, 'activa') === '1' }).eq('id', txt(fd, 'id'))
  if (error) return { error: traducir(error.message) }
  revalidatePath('/campus/admin', 'layout')
  return { ok: true }
}

// ── Ediciones (cada vez que se dicta un curso) ───────────
// Fecha de inicio, aula, profesor y cupo. La base valida: cupo 1–500 y ≤ capacidad del aula, aula activa,
// curso activo, una edición activa por vez del mismo curso y choques de aula/profesor en períodos superpuestos.
function datosEdicion(fd: FormData): { error: string } | { fecha_inicio: string; cupo: number; aula_id: string | null; profesor_id: string | null } {
  const fecha_inicio = txt(fd, 'fecha_inicio'), cupo = num(fd, 'cupo')
  if (!fechaValida(fecha_inicio)) return { error: 'Poné una fecha de inicio válida.' }
  if (fecha_inicio < '2020-01-01' || fecha_inicio > '2100-12-31') return { error: 'La fecha de inicio está fuera de rango.' }
  if (cupo === null || !Number.isInteger(cupo) || cupo < 1 || cupo > 500) return { error: 'El cupo debe ser un número entero entre 1 y 500.' }
  return { fecha_inicio, cupo, aula_id: txt(fd, 'aula_id') || null, profesor_id: txt(fd, 'profesor_id') || null }
}

export async function guardarEdicion(_: R, fd: FormData): Promise<R & { id?: string }> {
  const { sb } = await requireRole('admin')
  const id = txt(fd, 'id'), curso_id = txt(fd, 'curso_id')
  const d = datosEdicion(fd)
  if ('error' in d) return d
  const q = id
    ? sb.from('ediciones').update(d).eq('id', id).select('id').single()
    : sb.from('ediciones').insert({ ...d, curso_id }).select('id').single()
  const { data, error } = await q
  if (error) return { error: traducir(error.message) }
  revalidarCursos()
  return { ok: true, id: data.id }
}

// Duplicar (H3): mismos horarios, aula, profesor y cupo, con otra fecha de inicio; sin calendario ni alumnos.
// Las fechas de las clases se asignan de nuevo en la pestaña Calendario (R8).
export async function duplicarEdicion(_: R, fd: FormData): Promise<R & { id?: string }> {
  const { sb } = await requireRole('admin')
  const { data: origen } = await sb.from('ediciones').select('curso_id, aula_id, profesor_id, cupo').eq('id', txt(fd, 'id')).single()
  if (!origen) return { error: 'No se encontró la edición a duplicar.' }
  const fecha_inicio = txt(fd, 'fecha_inicio')
  if (!fechaValida(fecha_inicio)) return { error: 'Poné una fecha de inicio válida.' }
  const { data: nueva, error } = await sb.from('ediciones').insert({ ...origen, fecha_inicio }).select('id').single()
  if (error || !nueva) return { error: traducir(error?.message ?? '') }
  const { data: hs } = await sb.from('horarios_curso').select('dia_semana, hora_inicio, hora_fin').eq('edicion_id', txt(fd, 'id'))
  if (hs?.length) {
    const { error: eH } = await sb.from('horarios_curso').insert(hs.map((h) => ({ ...h, edicion_id: nueva.id })))
    if (eH) {
      await sb.from('ediciones').delete().eq('id', nueva.id) // sin ediciones a medias
      return { error: traducir(eH.message) }
    }
  }
  revalidarCursos()
  return { ok: true, id: nueva.id }
}

// Baja y reactivación de una edición (no afecta al curso ni a las otras ediciones). La reactivación vuelve a validar.
export async function setEstadoEdicion(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const { error } = await sb.from('ediciones').update({ activo: txt(fd, 'activo') === '1' }).eq('id', txt(fd, 'id'))
  if (error) return { error: traducir(error.message) }
  revalidarCursos()
  return { ok: true }
}

// Horarios de la edición: "día hora-inicio-hora-fin" por línea, ej. "1 18:00-20:00". Valida choques (RF-17).
export async function guardarHorarios(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const edicion_id = txt(fd, 'edicion_id')
  const filas = txt(fd, 'horarios').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^([0-6])\s+([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/)
    return m ? { edicion_id, dia_semana: Number(m[1]), hora_inicio: `${m[2]}:${m[3]}`, hora_fin: `${m[4]}:${m[5]}` } : null
  })
  if (filas.some((f) => !f)) return { error: `Formato: "día 18:00-20:00" (${DIAS.map((d, i) => `${i}=${d}`).join(', ')}).` }
  if ((filas as { hora_inicio: string; hora_fin: string }[]).some((f) => f.hora_fin <= f.hora_inicio)) return { error: 'La hora de fin tiene que ser posterior a la de inicio.' }
  const { error } = await sb.rpc('reemplazar_filas_curso', { p_tabla: 'horarios_curso', p_id: edicion_id, p_filas: filas })
  if (error) return { error: traducir(error.message) }
  revalidarCursos()
  return { ok: true }
}

// Calendario de la edición (RF-31): "N | AAAA-MM-DD | estado" por línea. El título de cada clase viene del plan
// del curso. Admin y profesor de la edición (RLS). La base valida que cada N° esté en el plan, que ninguna clase
// sea anterior al inicio y que el período no se superponga con otra edición del curso.
export async function guardarClases(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin', 'profesor')
  const edicion_id = txt(fd, 'edicion_id')
  const filas = txt(fd, 'clases').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [n, fecha, estado] = l.split('|').map((x) => x.trim())
    if (!/^\d+$/.test(n) || !fechaValida(fecha ?? '')) return null
    if (estado && !['programada', 'suspendida', 'reprogramada'].includes(estado)) return null
    return { edicion_id, numero: Number(n), fecha, estado: estado || 'programada' }
  })
  if (filas.some((f) => !f)) return { error: 'Revisá el calendario: cada clase necesita una fecha válida.' }
  const ok = filas as { numero: number; estado: string; fecha: string }[]
  if (!ok.length) return { error: 'Asigná la fecha de al menos una clase.' }
  if (new Set(ok.map((f) => f.numero)).size !== ok.length) return { error: 'Hay números de clase repetidos.' }
  if (new Set(ok.map((f) => f.fecha)).size !== ok.length) return { error: 'Hay dos clases en la misma fecha.' }
  const ordenadas = [...ok].sort((a, b) => a.numero - b.numero)
  if (ordenadas.some((f, i) => i > 0 && f.fecha < ordenadas[i - 1].fecha)) return { error: 'Las fechas tienen que seguir el orden de las clases.' }
  const nums = ok.map((f) => f.numero)

  const { data: previas } = await sb.from('clases').select('id, numero, fecha, estado').eq('edicion_id', edicion_id)
  const { error } = await sb.from('clases').upsert(ok as any[], { onConflict: 'edicion_id,plan_clase_id' })
  if (error) return { error: traducir(error.message) }
  const aBorrar = (previas ?? []).filter((c: any) => !nums.includes(c.numero))
  if (aBorrar.length) {
    const { error: eDel } = await sb.from('clases').delete().in('id', aBorrar.map((c: any) => c.id))
    if (eDel) return { error: 'Se guardó el calendario, pero no se pudieron quitar las clases que faltaban.' }
  }

  // RF-38 (por mail): avisar a los alumnos activos de clases suspendidas/reprogramadas (solo lo que cambió).
  const previa = new Map((previas ?? []).map((c: any) => [c.numero, c]))
  const aviso = ok.filter((f) => f.estado !== 'programada' && (() => { const a: any = previa.get(f.numero); return !a || a.estado !== f.estado || a.fecha !== f.fecha })())
  if (aviso.length && fd.get('avisar') === 'on') {
    const { data: ins } = await sb.from('inscripciones').select('profiles!inscripciones_alumno_id_fkey(email)').eq('edicion_id', edicion_id).eq('estado', 'activo')
    const { data: e } = await sb.from('ediciones').select('cursos(nombre)').eq('id', edicion_id).single()
    const nombre = uno(e?.cursos as unknown as { nombre?: string } | { nombre?: string }[] | null)?.nombre ?? 'tu curso'
    const to: string[] = (ins ?? []).map((i: any) => i.profiles?.email).filter(Boolean)
    // Un mail por alumno: en un único `to` cada uno vería el email de sus compañeros.
    const texto = aviso.map((a) => `Clase ${a.numero} (${a.fecha}): ${a.estado}`).join('\n') + '\n\nRecovery Parts'
    const envios = await Promise.all(to.map((t) => enviarMail(t, `Cambios en las clases de ${nombre}`, texto)))
    if (to.length && envios.some((x) => !x)) {
      revalidarCursos()
      return { error: 'El calendario se guardó, pero no se pudo enviar el aviso por mail a todos los alumnos.' }
    }
  }
  revalidarCursos()
  return { ok: true }
}

// ── Alumnos en la edición ────────────────────────────────
// Si el alumno ya existe se vincula y se avisa por mail (sin token); si no, se invita.
// Un alumno puede cursar otra edición del mismo curso (ej. si desertó y retoma), pero no dos veces la misma.
export async function agregarAlumno(_: R, fd: FormData): Promise<R> {
  const { sb, perfil: yo } = await requireRole('admin')
  const edicion_id = txt(fd, 'edicion_id')
  const email = txt(fd, 'email').toLowerCase()
  const { data: ed } = await sb.from('ediciones').select('cupo, activo, fecha_inicio, cursos(nombre, activo)').eq('id', edicion_id).single()
  const curso = uno(ed?.cursos as unknown as { nombre: string; activo: boolean } | { nombre: string; activo: boolean }[] | null)
  if (!ed || !ed.activo || !curso?.activo) return { error: 'La edición no existe o está dada de baja.' }
  // Se valida antes de invitar: si no, el alumno recibe un mail de una cuenta que se borra enseguida.
  const { count: ocupados } = await sb.from('inscripciones').select('id', { count: 'exact', head: true }).eq('edicion_id', edicion_id)
  if ((ocupados ?? 0) >= ed.cupo) return { error: 'La edición no tiene cupos disponibles.' }

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

  const { error } = await sb.from('inscripciones').insert({ alumno_id: alumno.id, edicion_id })
  if (error) {
    if (nuevo) await createAdminClient().auth.admin.deleteUser(alumno.id).catch(() => {}) // sin cuentas huérfanas
    return { error: /duplicate|unique/.test(error.message) ? 'El alumno ya está en esta edición.' : traducir(error.message) }
  }
  if (!nuevo) await enviarMail(email, `Te sumaron al curso ${curso.nombre} — Recovery Parts`, `Hola ${alumno.nombre}, fuiste agregado al curso ${curso.nombre}${ed.fecha_inicio ? ` (inicia el ${ed.fecha_inicio})` : ''}. Ingresá al Campus con tu cuenta de siempre.`)
  await sb.from('audit_log').insert({ actor_id: yo.id, accion: 'agregar_alumno', entidad: 'inscripciones', detalle: { edicion_id } })
  revalidarCursos()
  return { ok: true }
}

// RF-15/54/55: Desertor = estado final, con fecha y motivo obligatorio. Nunca se borra.
export async function marcarDesertor(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const motivo = txt(fd, 'motivo'), fecha = txt(fd, 'fecha') || hoyAR()
  if (!motivo) return { error: 'El motivo es obligatorio.' }
  if (motivo.length > 1000) return { error: 'El motivo puede tener hasta 1000 caracteres.' }
  if (!fechaValida(fecha)) return { error: 'Poné una fecha válida.' }
  if (fecha > hoyAR()) return { error: 'La fecha de deserción no puede ser futura.' }
  const { data, error } = await sb.from('inscripciones')
    .update({ estado: 'desertor', fecha_desercion: fecha, motivo_desercion: motivo })
    .eq('id', txt(fd, 'id')).neq('estado', 'desertor').select('id')
  if (error) return { error: traducir(error.message) }
  if (!data?.length) return { error: 'No se encontró la inscripción o el alumno ya figura como desertor.' }
  revalidarCursos()
  return { ok: true }
}

// Corregir la fecha recalcula el N° de clase (lo hace el trigger de la base).
export async function corregirFechaDesercion(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const fecha = txt(fd, 'fecha')
  if (!fechaValida(fecha)) return { error: 'Poné una fecha válida.' }
  if (fecha > hoyAR()) return { error: 'La fecha de deserción no puede ser futura.' }
  const { data, error } = await sb.from('inscripciones').update({ fecha_desercion: fecha }).eq('id', txt(fd, 'id')).eq('estado', 'desertor').select('id')
  if (!error && !data?.length) return { error: 'No se encontró un desertor con ese id.' }
  revalidarCursos()
  return fail(error) ?? { ok: true }
}

// RF-14 (🟡): al terminar la edición, los alumnos activos pasan a "finalizado" (habilita el ZIP, RF-35).
export async function finalizarEdicion(fd: FormData) {
  const { sb } = await requireRole('admin')
  await sb.from('inscripciones').update({ estado: 'finalizado' }).eq('edicion_id', txt(fd, 'id')).eq('estado', 'activo')
  revalidarCursos()
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
  if (!txt(fd, 'edicion_id')) return { error: 'Elegí la edición: sin edición ningún alumno vería la encuesta.' }
  const row = { titulo: txt(fd, 'titulo'), edicion_id: txt(fd, 'edicion_id'), preguntas, activa: fd.get('activa') === 'on' }
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
  const foto = imagenOpcional(txt(fd, 'foto_url')), imagen = imagenOpcional(txt(fd, 'imagen_url'))
  if (foto === undefined || imagen === undefined) return { error: 'Las imágenes deben ser URLs http(s) o rutas del sitio (/images/…).' }
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
