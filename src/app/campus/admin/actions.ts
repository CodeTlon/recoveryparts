'use server'

import { revalidatePath } from 'next/cache'
import { invalidarPublico } from '@/lib/cache-publico'
import { requireRole } from '@/lib/auth'
import { enviarLinkAcceso, invitarUsuario, cambiarEmailUsuario, eliminarUsuario } from '@/lib/users'
import { clienteAdmin } from '@/lib/db'
import { enviarMail } from '@/lib/mail'
import { mailCambiosClases, mailAgregadoCurso } from '@/lib/mail-templates'
import { DIAS } from '@/lib/types'
import { urlOpcional, imagenOpcional, extensionImagen, esUrlHttp } from '@/lib/validar'
import { hoyAR, momentoEdicion } from '@/lib/fechas'
import { guardarArchivo, urlPublica } from '@/lib/storage'

export type R = { ok?: boolean; error?: string }
const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const num = (fd: FormData, k: string) => (txt(fd, k) === '' ? null : Number(txt(fd, k)))

function traducir(m: string) {
  // Reglas de aulas (0010): los mensajes de la base ya son legibles y nombran los cursos afectados.
  if (/^(Cargá la capacidad|La capacidad del aula|No se puede dar de baja el aula|El aula .+ está dada de baja|El cupo \(\d+\) supera|Las aulas no se borran)/.test(m)) return m
  if (/aulas_nombre/.test(m)) return 'Ya existe un aula con ese nombre.'
  // Ediciones (0011): mensajes legibles de la base (superposición, fechas, plan de clases, curso de baja).
  if (/^(El calendario cambió|Se superpone con la edición|El curso está dado de baja|Cargá la fecha de inicio|La clase |El material no pertenece|El aula .+ de la edición)/.test(m)) return m
  if (/El profesor elegido no es un profesor/.test(m)) return 'Elegí un usuario con rol profesor.'
  if (/_no_vacio/.test(m)) return 'Completá los campos obligatorios.'
  if (/ediciones_cupo_check/.test(m)) return 'El cupo debe ser un número entero entre 1 y 500.'
  // Estructura del curso (0013): módulo vacío, clase sin módulo, taller con módulos, clase con fechas.
  if (/^(La clase «|El módulo «|Un taller no lleva|Las clases de cada módulo|El plan admite|No tenés permiso para editar)/.test(m)) return m
  // Estructura por edición y material base (0017).
  if (/^(Solo la administración edita la guía|El curso necesita al menos una clase|El material base va en una clase|Ese material no es de este curso|El material no es de este curso)/.test(m)) return m
  if (/^Estructura inválida/.test(m)) return 'La estructura cambió mientras la editabas. Recargá la página y volvé a intentar.'
  if (/modulos_curso_titulo_check/.test(m)) return 'Cada módulo necesita un título de hasta 120 caracteres.'
  if (/plan_clases_titulo_check|plan_clases_numero_check/.test(m)) return 'Revisá el plan: cada clase necesita un título de hasta 200 caracteres.'
  if (/cupos disponibles/.test(m)) return 'El curso no tiene cupos disponibles.'
  if (/cupo no puede ser menor/.test(m)) return 'El cupo no puede ser menor que los alumnos ya asignados.'
  if (/Superposición/.test(m)) return 'Hay superposición de aula o profesor en ese día y horario.'
  if (/duplicate key|unique/.test(m)) return 'Ya existe un registro con esos datos.'
  if (/hora_fin|horarios_curso_check/.test(m)) return 'La hora de fin tiene que ser posterior a la de inicio.'
  if (/check constraint/.test(m)) return 'Algún valor está fuera de rango. Revisá los números ingresados.'
  if (/Finalizado es un estado final/.test(m)) return 'Finalizado es un estado final.'
  if (/estado final/.test(m)) return 'Desertor es un estado final.'
  return 'No se pudo completar la operación.'
}
const fail = (e: { message: string } | null): R | null => (e ? { error: traducir(e.message) } : null)

// ── Usuarios ─────────────────────────────────────────────
// Solo el admin crea usuarios. Se genera un token de un solo uso (vence) y se envía por mail.
export async function crearUsuario(_: R, fd: FormData): Promise<R> {
  const { perfil: yo, sb } = await requireRole('admin')
  const email = txt(fd, 'email').toLowerCase()
  const rol = txt(fd, 'rol')
  const nombre = txt(fd, 'nombre'), apellido = txt(fd, 'apellido')
  if (!['profesor', 'alumno'].includes(rol)) return { error: 'Rol inválido.' }
  if (!nombre || !apellido || !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Completá nombre, apellido y un email válido.' }

  const { data: existente } = await sb.from('profiles').select('id, rol').eq('email', email).maybeSingle()
  if (existente) return { error: 'Ese email ya existe. Para un alumno, usá "Agregar alumno" desde el curso.' }

  const inv = await invitarUsuario(email, { rol, nombre, apellido, telefono: txt(fd, 'telefono') || null })
  if (!inv) return { error: 'No se pudo crear el usuario.' }
  await sb.from('audit_log').insert({ actor_id: yo.id, accion: 'invitar', entidad: 'profiles', detalle: { rol } })
  revalidatePath('/campus/admin/usuarios')
  if (!inv.enviado) return { error: 'El usuario se creó, pero no se pudo enviar el mail. Usá «Reenviar invitación» desde la lista.' }
  return { ok: true }
}

export async function reenviarInvitacion(_: R, fd: FormData): Promise<R> {
  const { sb, perfil: yo } = await requireRole('admin')
  const { data: p } = await sb.from('profiles').select('email, estado_cuenta').eq('id', txt(fd, 'id')).single()
  if (!p || p.estado_cuenta !== 'pendiente_activacion') return { error: 'Esa cuenta ya no está pendiente de activación.' }
  // Un token nuevo invalida el anterior.
  if (!(await enviarLinkAcceso(p.email, txt(fd, 'id'), 'invite'))) return { error: 'No se pudo enviar el mail. Probá de nuevo en unos minutos.' }
  await sb.from('audit_log').insert({ actor_id: yo.id, accion: 'reenviar_invitacion', entidad: 'profiles', entidad_id: txt(fd, 'id') })
  return { ok: true }
}

export async function setEstadoCuenta(_: R, fd: FormData): Promise<R> {
  const { sb, perfil: yo } = await requireRole('admin')
  const id = txt(fd, 'id'), estado = txt(fd, 'estado')
  if (id === yo.id) return { error: 'No podés deshabilitar tu propia cuenta.' }
  if (!['activa', 'inactiva'].includes(estado)) return { error: 'Estado inválido.' }
  const { data, error } = await sb.from('profiles').update({ estado_cuenta: estado }).eq('id', id).select('id')
  if (error) return { error: traducir(error.message) }
  if (!data?.length) return { error: 'No se encontró el usuario.' }
  // Inactiva: requireRole y el proxy miran estado_cuenta en cada request, así que corta la sesión al instante.
  revalidatePath('/campus/admin/usuarios')
  return { ok: true }
}

export async function cambiarEmail(_: R, fd: FormData): Promise<R> {
  const { sb, perfil: yo } = await requireRole('admin')
  const id = txt(fd, 'id'), email = txt(fd, 'email').toLowerCase()
  if (!UUID.test(id) || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return { error: 'Email inválido.' }
  // Cuenta de acceso y perfil se cambian en una sola sentencia: no pueden quedar con emails distintos.
  let cambiado = false
  try { cambiado = await cambiarEmailUsuario(id, email) } catch { return { error: 'No se pudo cambiar el email (¿ya está en uso?).' } }
  if (!cambiado) return { error: 'No se encontró el usuario.' }
  await sb.from('audit_log').insert({ actor_id: yo.id, accion: 'cambiar_email', entidad: 'profiles', entidad_id: id })
  revalidatePath('/campus/admin/usuarios')
  return { ok: true }
}

export async function actualizarPerfil(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const id = txt(fd, 'id'), nombre = txt(fd, 'nombre'), apellido = txt(fd, 'apellido')
  const telefono = txt(fd, 'telefono'), experiencia = txt(fd, 'experiencia'), certificaciones = txt(fd, 'certificaciones')
  if (!UUID.test(id)) return { error: 'Usuario inválido.' }
  if (!nombre || !apellido || nombre.length > 80 || apellido.length > 80) return { error: 'Nombre y apellido son obligatorios (hasta 80 caracteres).' }
  if (telefono.length > 40 || experiencia.length > 2000 || certificaciones.length > 2000) return { error: 'Alguno de los datos es demasiado largo.' }
  const foto = imagenOpcional(txt(fd, 'foto_url'))
  if (foto === undefined) return { error: 'Subí la foto desde el campo de imagen (la ruta debe ser del sitio, ej. /media/… o /images/…).' }
  const { data, error } = await sb.from('profiles').update({
    nombre, apellido, telefono: telefono || null, experiencia: experiencia || null, certificaciones: certificaciones || null, foto_url: foto,
  }).eq('id', id).select('id')
  if (error) return { error: traducir(error.message) }
  if (!data?.length) return { error: 'No se encontró el usuario.' }
  revalidatePath('/campus/admin/usuarios'); invalidarPublico() // el nombre del profesor se ve en las fechas
  return { ok: true }
}

// ── Cursos (catálogo) ────────────────────────────────────
// El curso es el contenido que se carga una vez; cada vez que se dicta es una edición (ver más abajo).
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const fechaValida = (f: string) => FECHA.test(f) && !Number.isNaN(Date.parse(`${f}T12:00:00Z`)) && new Date(`${f}T12:00:00Z`).toISOString().slice(0, 10) === f
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fechaInicioValida = (f: string) => fechaValida(f) && f >= '2020-01-01' && f <= '2100-12-31'
// Las relaciones muchos-a-uno (edición → curso) llegan como objeto; el tipo inferido es una lista.
const uno = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)
const revalidarCursos = () => { revalidatePath('/campus', 'layout'); revalidatePath('/cursos', 'layout'); revalidatePath('/'); invalidarPublico() }

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
  if (imagen === undefined) return { error: 'Subí la imagen desde el campo de imagen (la ruta debe ser del sitio, ej. /media/… o /images/…).' }
  if (video === undefined) return { error: 'El video debe ser un link http(s).' }
  const slug = slugify(txt(fd, 'slug') || nombre)
  if (!slug) return { error: 'El nombre o el slug necesitan al menos una letra o un número (se usan en la dirección del curso).' }
  const row = {
    nombre, slug,
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

export async function bajaCurso(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const { data, error } = await sb.from('cursos').update({ activo: false }).eq('id', txt(fd, 'id')).select('id')
  if (error) return { error: traducir(error.message) }
  if (!data?.length) return { error: 'No se encontró el curso.' }
  revalidarCursos()
  return { ok: true }
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

// Estructura del curso (RF-26, RF-31, RF-58): módulos con sus clases (teóricas o prácticas); en talleres, solo clases.
// Llega como JSON del EstructuraEditor. La base guarda todo de una vez y valida la regla de estructura
// (sin clases sueltas ni módulos vacíos en cursos; sin módulos en talleres).
type EstructuraIn = { modulos: { id?: string; titulo: string }[]; clases: { id?: string; titulo: string; tipo: string; modulo: number | null }[] }
function leerEstructura(fd: FormData): { error: string } | { p_modulos: unknown[]; p_clases: unknown[] } {
  let e: EstructuraIn
  try { e = JSON.parse(txt(fd, 'estructura')) } catch { return { error: 'No se pudo leer la estructura.' } }
  if (!Array.isArray(e?.modulos) || !Array.isArray(e?.clases)) return { error: 'No se pudo leer la estructura.' }
  if (e.modulos.some((m) => !m.titulo?.trim() || m.titulo.trim().length > 120)) return { error: 'Cada módulo necesita un título de hasta 120 caracteres.' }
  if (e.clases.some((c) => !c.titulo?.trim() || c.titulo.trim().length > 200)) return { error: 'Cada clase necesita un título de hasta 200 caracteres.' }
  if (e.clases.some((c) => !['teorica', 'practica'].includes(c.tipo))) return { error: 'Cada clase es teórica o práctica.' }
  if (e.clases.length > 500) return { error: 'El plan admite hasta 500 clases.' }
  return {
    p_modulos: e.modulos.map((m) => ({ id: m.id ?? null, titulo: m.titulo.trim() })),
    p_clases: e.clases.map((c) => ({ id: c.id ?? null, titulo: c.titulo.trim(), tipo: c.tipo, modulo: c.modulo })),
  }
}

// Guía general del curso: solo el admin. Es con lo que arranca cada edición nueva.
export async function guardarEstructura(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const e = leerEstructura(fd)
  if ('error' in e) return e
  const { error } = await sb.rpc('guardar_estructura', { p_curso: txt(fd, 'curso_id'), ...e })
  if (error) return { error: traducir(error.message) }
  revalidarCursos()
  return { ok: true }
}

// Estructura propia de una edición (admin o su profesor; la base valida el permiso). La primera vez copia la guía
// a la edición; los cambios no tocan la guía ni las otras ediciones.
export async function guardarEstructuraEdicion(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin', 'profesor')
  const e = leerEstructura(fd)
  if ('error' in e) return e
  if (!e.p_clases.length) return { error: 'El curso necesita al menos una clase.' }
  const { error } = await sb.rpc('guardar_estructura_edicion', { p_edicion: txt(fd, 'edicion_id'), ...e })
  if (error) return { error: traducir(error.message) }
  revalidarCursos()
  return { ok: true }
}

// Volver a la guía general: descarta la estructura propia de la edición (la UI pide confirmar antes).
export async function restablecerEstructura(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin', 'profesor')
  const { error } = await sb.rpc('restablecer_estructura', { p_edicion: txt(fd, 'edicion_id') })
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
  revalidatePath('/campus/admin', 'layout'); revalidatePath('/cursos', 'layout'); invalidarPublico()
  return { ok: true }
}

export async function setEstadoAula(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const { error } = await sb.from('aulas').update({ activa: txt(fd, 'activa') === '1' }).eq('id', txt(fd, 'id'))
  if (error) return { error: traducir(error.message) }
  revalidatePath('/campus/admin', 'layout'); invalidarPublico()
  return { ok: true }
}

// ── Ediciones (cada vez que se dicta un curso) ───────────
// Fecha de inicio, aula, profesor y cupo. La base valida: cupo 1–500 y ≤ capacidad del aula, aula activa,
// curso activo, una edición activa por vez del mismo curso y choques de aula/profesor en períodos superpuestos.
function datosEdicion(fd: FormData): { error: string } | { fecha_inicio: string; cupo: number; aula_id: string | null; profesor_id: string | null } {
  const fecha_inicio = txt(fd, 'fecha_inicio'), cupo = num(fd, 'cupo')
  if (!fechaInicioValida(fecha_inicio)) return { error: 'Poné una fecha de inicio válida (entre 2020 y 2100).' }
  if (cupo === null || !Number.isInteger(cupo) || cupo < 1 || cupo > 500) return { error: 'El cupo debe ser un número entero entre 1 y 500.' }
  const aula_id = txt(fd, 'aula_id') || null, profesor_id = txt(fd, 'profesor_id') || null
  if ((aula_id && !UUID.test(aula_id)) || (profesor_id && !UUID.test(profesor_id))) return { error: 'Aula o profesor inválidos.' }
  return { fecha_inicio, cupo, aula_id, profesor_id } // que profesor_id sea un profesor lo valida la base (0023)
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
  if (!fechaInicioValida(fecha_inicio)) return { error: 'Poné una fecha de inicio válida (entre 2020 y 2100).' }
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
  const { sb, perfil } = await requireRole('admin', 'profesor')
  const edicion_id = txt(fd, 'edicion_id')
  const filas = txt(fd, 'clases').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [plan_clase_id, fecha, estado] = l.split('|').map((x) => x.trim())
    if (!/^[0-9a-f-]{36}$/i.test(plan_clase_id) || !fechaValida(fecha ?? '')) return null
    if (estado && !['programada', 'suspendida', 'reprogramada', 'salteada'].includes(estado)) return null
    return { edicion_id, plan_clase_id, fecha, estado: estado || 'programada' }
  })
  if (filas.some((f) => !f)) return { error: 'Revisá el calendario: cada clase necesita una fecha válida.' }
  const ok = filas as { plan_clase_id: string; estado: string; fecha: string }[]
  if (!ok.length) return { error: 'Asigná la fecha de al menos una clase.' }
  if (new Set(ok.map((f) => f.plan_clase_id)).size !== ok.length) return { error: 'Hay clases repetidas.' }
  // Orden flexible: el profesor puede adelantar una clase (fecha antes que otras) o saltearla. Una salteada no se
  // dicta, así que su fecha puede quedar ocupada por otra clase.
  const dictadas = ok.filter((f) => f.estado !== 'salteada').map((f) => f.fecha)
  if (new Set(dictadas).size !== dictadas.length) return { error: 'Hay dos clases en la misma fecha.' }
  // Una sola transacción en la base (upsert + borrado de las que faltan, serializado por edición); devuelve cómo estaban.
  const { error } = await sb.rpc('guardar_calendario', { p_edicion: edicion_id, p_filas: ok, ...(txt(fd, 'version') ? { p_version: txt(fd, 'version') } : {}) })
  if (error) {
    const msg = traducir(error.message)
    // El profesor no maneja el concepto de «edición»: para él son otras fechas del mismo curso.
    return { error: perfil.rol === 'profesor' ? msg.replace(/^Se superpone con la edición del (\S+) de este curso\./, 'Las fechas se superponen con otro dictado de este curso, que empieza el $1.') : msg }
  }
  // RF-38 (por mail): las clases suspendidas/reprogramadas que cambiaron quedaron marcadas `aviso_pendiente` en la base.
  // Saltear o adelantar una clase NO avisa: el día de cursada no cambia y el profesor lo dice en clase.
  // Si no se tildó «avisar ahora» las marcas quedan y la pantalla ofrece enviarlas cuando se quiera.
  revalidarCursos()
  if (fd.get('avisar') === 'on') return await enviarAvisosClases(sb, edicion_id, 'El calendario se guardó, pero')
  return { ok: true }
}

/** Manda por mail a los alumnos activos las clases con `aviso_pendiente` y, si salió bien, baja la marca. Si algún mail
 *  falla la marca queda: se puede reintentar sin perder el aviso. */
async function enviarAvisosClases(sb: Awaited<ReturnType<typeof requireRole>>['sb'], edicion_id: string, prefijo = ''): Promise<R> {
  const { data: pend } = await sb.from('clases').select('plan_clase_id, fecha, estado').eq('edicion_id', edicion_id).eq('aviso_pendiente', true).order('fecha')
  const aviso = (pend ?? []) as { plan_clase_id: string; fecha: string; estado: string }[]
  if (!aviso.length) return { ok: true }
  const { data: ins } = await sb.from('inscripciones').select('profiles!inscripciones_alumno_id_fkey(email)').eq('edicion_id', edicion_id).eq('estado', 'activo')
  const { data: e } = await sb.from('ediciones').select('cursos(nombre)').eq('id', edicion_id).single()
  const { data: pcs } = await sb.from('plan_clases').select('id, titulo').in('id', aviso.map((a) => a.plan_clase_id))
  const nombre = uno(e?.cursos as unknown as { nombre?: string } | { nombre?: string }[] | null)?.nombre ?? 'tu curso'
  const to: string[] = (ins ?? []).map((i: any) => i.profiles?.email).filter(Boolean)
  // Un mail por alumno: en un único `to` cada uno vería el email de sus compañeros.
  const mail = mailCambiosClases(nombre, aviso.map((a) => ({ clase: pcs?.find((p) => p.id === a.plan_clase_id)?.titulo ?? 'Clase', fecha: a.fecha, estado: a.estado })))
  const envios = await Promise.all(to.map((t) => enviarMail(t, mail)))
  const fallaron = envios.filter((x) => !x).length
  if (fallaron) {
    revalidarCursos()
    return { error: `${prefijo ? prefijo + ' ' : ''}no se pudo enviar el aviso a ${fallaron} de ${to.length} alumnos. Los avisos quedan pendientes: reintentá desde el calendario (los que ya lo recibieron lo recibirán de nuevo).` }
  }
  await sb.from('clases').update({ aviso_pendiente: false }).eq('edicion_id', edicion_id).eq('aviso_pendiente', true)
  revalidarCursos()
  return { ok: true }
}

// Envía los avisos de clases suspendidas/reprogramadas que quedaron pendientes (admin y profesor de la edición, por RLS).
export async function enviarAvisosPendientes(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin', 'profesor')
  const edicion_id = txt(fd, 'edicion_id')
  if (!UUID.test(edicion_id)) return { error: 'Edición inválida.' }
  return await enviarAvisosClases(sb, edicion_id)
}

// ── Alumnos en la edición ────────────────────────────────
// Si el alumno ya existe se vincula y se avisa por mail (sin token); si no, se invita.
// Un alumno puede cursar otra edición del mismo curso (ej. si desertó y retoma), pero no dos veces la misma.
export async function agregarAlumno(_: R, fd: FormData): Promise<R> {
  const { sb, perfil: yo } = await requireRole('admin')
  const edicion_id = txt(fd, 'edicion_id')
  const email = txt(fd, 'email').toLowerCase()
  const { data: ed } = await sb.from('ediciones').select('cupo, activo, fecha_inicio, cursos(nombre, activo), clases(fecha)').eq('id', edicion_id).single()
  const curso = uno(ed?.cursos as unknown as { nombre: string; activo: boolean } | { nombre: string; activo: boolean }[] | null)
  if (!ed || !ed.activo || !curso?.activo) return { error: 'La edición no existe o está dada de baja.' }
  const fechas = ((ed.clases ?? []) as { fecha: string }[]).map((c) => c.fecha)
  if (momentoEdicion({ activo: true, fecha_inicio: ed.fecha_inicio, fechas }, hoyAR()).momento === 'terminada')
    return { error: 'La edición ya terminó: no se pueden agregar alumnos.' }
  // Se valida antes de invitar: si no, el alumno recibe un mail de una cuenta que se borra enseguida.
  const { count: ocupados } = await sb.from('inscripciones').select('id', { count: 'exact', head: true }).eq('edicion_id', edicion_id)
  if ((ocupados ?? 0) >= ed.cupo) return { error: 'La edición no tiene cupos disponibles.' }

  let { data: alumno } = await sb.from('profiles').select('id, rol, nombre, estado_cuenta').eq('email', email).maybeSingle()
  let nuevo = false
  if (alumno && alumno.rol !== 'alumno') return { error: 'Ese email pertenece a un profesor o admin.' }
  if (alumno?.estado_cuenta === 'inactiva') return { error: 'La cuenta de ese alumno está inactiva. Reactivala desde Usuarios antes de agregarlo.' }

  let mailPendiente = false
  if (!alumno) {
    const nombre = txt(fd, 'nombre'), apellido = txt(fd, 'apellido')
    if (!nombre || !apellido || !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Alumno nuevo: completá nombre, apellido y un email válido.' }
    const inv = await invitarUsuario(email, { rol: 'alumno', nombre, apellido, telefono: txt(fd, 'telefono') || null })
    if (!inv) return { error: 'No se pudo crear el alumno.' }
    alumno = { id: inv.id, rol: 'alumno', nombre }
    nuevo = true
    mailPendiente = !inv.enviado
  }

  const { error } = await sb.from('inscripciones').insert({ alumno_id: alumno.id, edicion_id })
  if (error) {
    if (nuevo) await eliminarUsuario(alumno.id).catch(() => {}) // sin cuentas huérfanas
    return { error: /duplicate|unique/.test(error.message) ? 'El alumno ya está en esta edición.' : traducir(error.message) }
  }
  if (!nuevo) await enviarMail(email, mailAgregadoCurso(alumno.nombre, curso.nombre, ed.fecha_inicio))
  await sb.from('audit_log').insert({ actor_id: yo.id, accion: 'agregar_alumno', entidad: 'inscripciones', detalle: { edicion_id } })
  revalidarCursos()
  if (mailPendiente) return { error: 'El alumno se agregó al curso, pero no se pudo enviar el mail de invitación. Usá «Reenviar invitación» desde Usuarios.' }
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
    .eq('id', txt(fd, 'id')).eq('estado', 'activo').select('id')
  if (error) return { error: traducir(error.message) }
  if (!data?.length) return { error: 'No se encontró la inscripción, o el alumno ya figura como desertor o finalizado.' }
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
export async function finalizarEdicion(_: R, fd: FormData): Promise<R> {
  const { sb, perfil: yo } = await requireRole('admin')
  const id = txt(fd, 'id')
  const { data: ed } = await sb.from('ediciones').select('fecha_inicio').eq('id', id).maybeSingle()
  if (!ed || (ed.fecha_inicio && ed.fecha_inicio > hoyAR())) return { error: 'La edición todavía no empezó: no se puede finalizar.' }
  const { data, error } = await sb.from('inscripciones').update({ estado: 'finalizado' }).eq('edicion_id', id).eq('estado', 'activo').select('id')
  if (error) return { error: traducir(error.message) }
  await sb.from('audit_log').insert({ actor_id: yo.id, accion: 'finalizar_edicion', entidad: 'ediciones', entidad_id: id, detalle: { alumnos: data?.length ?? 0 } })
  revalidarCursos()
  return { ok: true }
}

// ── Encuestas (RF-47) ────────────────────────────────────
// Preguntas, una por línea: "puntaje | ¿Texto?" o "texto | ¿Texto?".
export async function guardarEncuesta(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  // Solo se interpreta el prefijo si es exactamente «puntaje» o «texto» (sin distinguir mayúsculas): una pregunta como
  // «¿A | B?» queda entera, sin recortarse ni cambiar de tipo.
  const preguntas = txt(fd, 'preguntas').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(puntaje|texto)\s*\|\s*(.*)$/i)
    return m ? { tipo: m[1].toLowerCase(), texto: m[2].trim() } : { tipo: 'puntaje', texto: l }
  })
  if (!txt(fd, 'titulo') || !preguntas.length) return { error: 'Poné un título y al menos una pregunta.' }
  if (txt(fd, 'titulo').length > 160) return { error: 'El título admite hasta 160 caracteres.' }
  if (preguntas.length > 30 || preguntas.some((p) => !p.texto || p.texto.length > 300)) return { error: 'Hasta 30 preguntas, cada una de 1 a 300 caracteres.' }
  if (!UUID.test(txt(fd, 'edicion_id'))) return { error: 'Elegí la edición: sin edición ningún alumno vería la encuesta.' }
  const row = { titulo: txt(fd, 'titulo'), edicion_id: txt(fd, 'edicion_id'), preguntas, activa: fd.get('activa') === 'on' }
  const id = txt(fd, 'id')
  if (id) {
    // Las respuestas se guardan por N° de pregunta: cambiar las preguntas con respuestas las desalinearía.
    const { data: previa } = await sb.from('encuestas').select('preguntas, edicion_id').eq('id', id).single()
    const { count } = await sb.from('encuesta_respuestas').select('id', { count: 'exact', head: true }).eq('encuesta_id', id)
    if ((count ?? 0) > 0 && JSON.stringify(previa?.preguntas) !== JSON.stringify(preguntas))
      return { error: 'Esta encuesta ya tiene respuestas: no se pueden cambiar las preguntas. Creá una encuesta nueva.' }
    // Las respuestas pertenecen al grupo de esa edición: moverla las mezclaría con otro grupo.
    if ((count ?? 0) > 0 && previa?.edicion_id !== row.edicion_id)
      return { error: 'Esta encuesta ya tiene respuestas: no se puede cambiar de edición. Creá una encuesta nueva.' }
  }
  const { error } = id ? await sb.from('encuestas').update(row).eq('id', id) : await sb.from('encuestas').insert(row)
  revalidatePath('/campus/admin/encuestas')
  return fail(error) ?? { ok: true }
}

// ── CMS del sitio (RF-53) ────────────────────────────────
// Los campos llegan como rutas "grupo.campo" (ej. areas.diseno.titulo) y se anidan en el JSON.
const CLAVES_SETTINGS = ['contacto', 'hero', 'stats', 'nosotros', 'areas', 'campus']
// Formato de los campos del CMS que se usan como link, imagen, email o interruptor (el resto es texto libre).
function campoSettingInvalido(campo: string, val: string): string | null {
  if (!val) return null
  if (campo === 'imagen_url' && imagenOpcional(val) === undefined) return 'Las imágenes tienen que ser del sitio: subilas desde el campo de imagen.'
  if (campo === 'video_url' && !esUrlHttp(val) && imagenOpcional(val) === undefined) return 'El video debe ser un link http(s) o un video subido al sitio.'
  if (campo === 'email' && !/^\S+@\S+\.\S+$/.test(val)) return 'El email de contacto no es válido.'
  if (campo === 'whatsapp' && !/^\d{8,15}$/.test(val)) return 'El WhatsApp va solo con números y código de país (ej. 549351…).'
  if (campo === 'instagram' && !/^@?[A-Za-z0-9._]{1,30}$/.test(val)) return 'El Instagram va como @usuario.'
  if (campo === 'entrada_directa' && !['true', 'false'].includes(val)) return 'Entrada directa: elegí Activa o Desactivada.'
  return null
}
export async function guardarSetting(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const clave = txt(fd, 'clave')
  if (!CLAVES_SETTINGS.includes(clave)) return { error: 'Sección inválida.' }
  const valor: Record<string, any> = {}
  for (const [k, v] of fd.entries()) {
    if (k === 'clave' || typeof v !== 'string') continue
    const path = k.split('.')
    if (path.some((p) => !/^[a-z_]+$/.test(p) || ['__proto__', 'constructor', 'prototype'].includes(p))) continue
    let o = valor
    // Si un tramo ya es un valor suelto (llegaron «a» y «a.b»), se lo reemplaza por un objeto en vez de fallar.
    path.slice(0, -1).forEach((p) => { if (typeof o[p] !== 'object' || o[p] === null) o[p] = {}; o = o[p] })
    const val = v.trim()
    const last = path.at(-1)!
    if (val.length > 2000) return { error: 'Alguno de los textos es demasiado largo (hasta 2000 caracteres).' }
    if (['aulas', 'profesores', 'egresados'].includes(last)) { o[last] = /^\d+$/.test(val) && val.length <= 6 ? Number(val) : null; continue } // vacío = null (se oculta en la home)
    const invalido = campoSettingInvalido(last, val)
    if (invalido) return { error: invalido }
    o[last] = val
  }
  // Se mezcla con lo guardado: el formulario puede no traer todas las claves y no hay que perderlas.
  const { data: actual } = await sb.from('site_settings').select('valor').eq('clave', clave).maybeSingle()
  const mezclar = (a: any, b: any): any => (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(b))
    ? Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, k in b ? mezclar(a[k], b[k]) : a[k]]))
    : b
  const { error } = await sb.from('site_settings').upsert({ clave, valor: mezclar(actual?.valor ?? {}, valor) })
  revalidatePath('/', 'layout'); invalidarPublico()
  return fail(error) ?? { ok: true }
}

const TABLAS_CMS = { egresado: 'cms_egresados', testimonio: 'cms_testimonios', faq: 'cms_faq', foto: 'cms_galeria' } as const
export async function guardarItemCms(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const tipo = txt(fd, 'tipo') as keyof typeof TABLAS_CMS
  const tabla = TABLAS_CMS[tipo]
  if (!tabla) return { error: 'Tipo inválido.' }
  const orden = num(fd, 'orden') ?? 0
  if (!Number.isInteger(orden) || orden < 0 || orden > 9999) return { error: 'El orden debe ser un número entero entre 0 y 9999.' }
  const puntaje = num(fd, 'puntaje') ?? 5
  if (tipo === 'testimonio' && !(Number.isInteger(puntaje) && puntaje >= 1 && puntaje <= 5)) return { error: 'El puntaje va de 1 a 5.' }
  const obligatorios: Record<string, [string, number][]> = {
    egresado: [['nombre', 120], ['especialidad', 160]], testimonio: [['nombre', 120], ['texto', 1500]],
    faq: [['pregunta', 300], ['respuesta', 3000]], foto: [['categoria', 80], ['alt', 200]],
  }
  for (const [campo, max] of obligatorios[tipo]) {
    const t = txt(fd, campo)
    if (!t) return { error: 'Completá todos los campos obligatorios.' }
    if (t.length > max) return { error: `El campo «${campo}» admite hasta ${max} caracteres.` }
  }
  const foto = imagenOpcional(txt(fd, 'foto_url')), imagen = imagenOpcional(txt(fd, 'imagen_url'))
  if (foto === undefined || imagen === undefined) return { error: 'Subí las imágenes desde el campo de imagen (las rutas deben ser del sitio, ej. /media/… o /images/…).' }
  if (tipo === 'foto' && !imagen) return { error: 'La foto de la galería necesita una imagen.' }
  const rows: Record<string, unknown> = {
    egresado: { nombre: txt(fd, 'nombre'), especialidad: txt(fd, 'especialidad'), foto_url: foto, destacado: fd.get('destacado') === 'on', orden },
    testimonio: { nombre: txt(fd, 'nombre'), curso: txt(fd, 'curso') || null, texto: txt(fd, 'texto'), puntaje, foto_url: foto, curso_id: txt(fd, 'curso_id') || null, orden },
    faq: { pregunta: txt(fd, 'pregunta'), respuesta: txt(fd, 'respuesta'), orden },
    foto: { categoria: txt(fd, 'categoria'), area: txt(fd, 'area') || null, imagen_url: imagen ?? '', alt: txt(fd, 'alt'), descripcion: txt(fd, 'descripcion') || null, orden },
  }[tipo]
  const id = txt(fd, 'id')
  if (id && !UUID.test(id)) return { error: 'Elemento inválido.' }
  const { error } = id ? await sb.from(tabla).update(rows).eq('id', id) : await sb.from(tabla).insert(rows)
  revalidatePath('/', 'layout'); invalidarPublico()
  return fail(error) ?? { ok: true }
}

export async function borrarItemCms(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const tabla = TABLAS_CMS[txt(fd, 'tipo') as keyof typeof TABLAS_CMS]
  if (!tabla) return { error: 'Tipo inválido.' }
  const { error } = await sb.from(tabla).delete().eq('id', txt(fd, 'id'))
  if (error) return { error: traducir(error.message) }
  revalidatePath('/', 'layout'); invalidarPublico()
  return { ok: true }
}

export async function marcarContactoLeido(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('admin')
  const { error } = await sb.from('contactos').update({ leido: fd.get('leido') === '1' }).eq('id', txt(fd, 'id'))
  if (error) return { error: traducir(error.message) }
  revalidatePath('/campus/admin/consultas')
  return { ok: true }
}

// Sube una imagen del CMS y devuelve la URL (para pegar en los campos de imagen).
export async function subirImagen(_: { url?: string; error?: string }, fd: FormData): Promise<{ url?: string; error?: string }> {
  await requireRole('admin')
  const f = fd.get('archivo') as File | null
  if (!f || !f.size) return { error: 'Elegí una imagen.' }
  if (!['image/webp', 'image/jpeg', 'image/png', 'image/avif'].includes(f.type) || f.size > 8 * 1024 * 1024) return { error: 'Solo WebP/JPG/PNG/AVIF de hasta 8 MB.' }
  // El `type` lo manda el cliente: se confirma con la firma real del archivo.
  const ext = extensionImagen(new Uint8Array(await f.slice(0, 12).arrayBuffer()))
  if (!ext) return { error: 'El archivo no es una imagen válida.' }
  const nombre = `${crypto.randomUUID()}.${ext}`
  try { await guardarArchivo('sitio', nombre, new Uint8Array(await f.arrayBuffer())) } catch { return { error: 'No se pudo subir la imagen.' } }
  return { url: urlPublica(nombre) }
}
