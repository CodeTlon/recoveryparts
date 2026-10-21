'use server'

import { revalidatePath } from 'next/cache'
import { invalidarPublico } from '@/lib/cache-publico'
import { requireRole } from '@/lib/auth'
import { guardarArchivo, borrarArchivo } from '@/lib/storage'
import type { R } from '../admin/actions'

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const MAX_PDF = 25 * 1024 * 1024
const revalidar = () => { revalidatePath('/campus', 'layout'); invalidarPublico() }

// RF-05 / RF-58: hay dos clases de material.
//  - BASE: lo carga el admin en una clase de la guía general del curso; se ve en todas las ediciones que conservan
//    esa clase y el profesor no lo puede borrar.
//  - DE LA EDICIÓN: lo sube el profesor para su curso (edicion_id); no aparece en otras ediciones y solo él lo borra.
// Se asocia a una clase (por id: si la clase cambia de lugar, el material la sigue) o queda «general». El alumno lo ve
// solo cuando se libera en su edición (RF-32). RLS y los triggers de la base validan todo esto otra vez.
type Sb = Awaited<ReturnType<typeof requireRole>>['sb']
type Material = { curso_id: string; edicion_id: string | null; titulo: string; plan_clase_id: string | null }
async function validarMaterial(sb: Sb, rol: string, fd: FormData): Promise<{ error: string } | Material> {
  const curso_id = txt(fd, 'curso_id'), titulo = txt(fd, 'titulo'), plan_clase_id = txt(fd, 'plan_clase_id') || null
  const edicion_id = rol === 'profesor' ? txt(fd, 'edicion_id') || null : null
  if (!titulo || titulo.length > 200) return { error: 'Poné un título de hasta 200 caracteres.' }
  if (rol === 'profesor' && !edicion_id) return { error: 'No se pudo identificar el curso.' }
  if (plan_clase_id) {
    let ok = false
    if (edicion_id) {
      const { data } = await sb.rpc('estructura_edicion', { p_edicion: edicion_id })
      ok = !!(data as { clases: { id: string }[] } | null)?.clases.some((c) => c.id === plan_clase_id)
    } else {
      const { data } = await sb.from('plan_clases').select('id').eq('curso_id', curso_id).eq('id', plan_clase_id).is('edicion_id', null).maybeSingle()
      ok = !!data
    }
    if (!ok) return { error: 'Esa clase no es de este curso.' }
  }
  return { curso_id, edicion_id, titulo, plan_clase_id }
}

// Si se tildó «liberarlo ya», se registra la liberación manual en esa edición.
async function liberarSiCorresponde(sb: Sb, fd: FormData, material_id: string) {
  const edicion_id = txt(fd, 'edicion_id')
  if (edicion_id && fd.get('liberar_ya') === 'on') await sb.from('materiales_liberados').insert({ edicion_id, material_id })
}

// RF-05: PDF a disco privado. RLS de `materiales`: el profesor solo carga en su edición; el admin, material base.
export async function subirPdf(_: R, fd: FormData): Promise<R> {
  const { sb, perfil } = await requireRole('profesor', 'admin')
  const v = await validarMaterial(sb, perfil.rol, fd)
  if ('error' in v) return v
  const f = fd.get('archivo') as File | null
  if (!f || !f.size) return { error: 'Elegí un PDF.' }
  if (f.size > MAX_PDF) return { error: 'El PDF supera los 25 MB.' }
  const head = new TextDecoder().decode(new Uint8Array(await f.slice(0, 5).arrayBuffer()))
  if (f.type !== 'application/pdf' || head !== '%PDF-') return { error: 'El archivo no es un PDF válido.' }

  // Primero la fila: RLS de `materiales` verifica que sea su edición. Recién después se guarda el archivo.
  const path = `${v.curso_id}/${crypto.randomUUID()}.pdf`
  const { data, error } = await sb.from('materiales').insert({ ...v, tipo: 'pdf', storage_path: path, subido_por: perfil.id }).select('id').single()
  if (error || !data) return { error: 'No se pudo registrar el material (¿dictás este curso?).' }
  try { await guardarArchivo('materiales', path, new Uint8Array(await f.arrayBuffer())) } catch {
    await sb.from('materiales').delete().eq('id', data.id)
    return { error: 'No se pudo subir el PDF.' }
  }
  await liberarSiCorresponde(sb, fd, data.id)
  revalidar()
  return { ok: true }
}

// RF-36: videos como link (YouTube no listado / Drive). No se alojan videos.
export async function agregarLink(_: R, fd: FormData): Promise<R> {
  const { sb, perfil } = await requireRole('profesor', 'admin')
  const v = await validarMaterial(sb, perfil.rol, fd)
  if ('error' in v) return v
  const url = txt(fd, 'url')
  try { if (!['http:', 'https:'].includes(new URL(url).protocol)) throw 0 } catch { return { error: 'Link inválido (debe empezar con https://).' } }
  if (url.length > 2000) return { error: 'El link es demasiado largo.' }
  const { data, error } = await sb.from('materiales').insert({ ...v, tipo: 'link', url, subido_por: perfil.id }).select('id').single()
  if (error || !data) return { error: 'No se pudo guardar el link.' }
  await liberarSiCorresponde(sb, fd, data.id)
  revalidar()
  return { ok: true }
}

// RF-07 / RF-32: liberar antes de tiempo en MI edición, o quitar esa liberación manual.
export async function liberarMaterial(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('profesor', 'admin')
  const edicion_id = txt(fd, 'edicion_id'), material_id = txt(fd, 'id')
  const { error } = fd.get('liberar') === '1'
    ? await sb.from('materiales_liberados').upsert({ edicion_id, material_id }, { onConflict: 'edicion_id,material_id' })
    : await sb.from('materiales_liberados').delete().eq('edicion_id', edicion_id).eq('material_id', material_id)
  if (error) return { error: 'No se pudo cambiar la liberación del material.' }
  revalidar()
  return { ok: true }
}

// Borra un material. RLS decide: el profesor solo borra el que subió él para su edición (el base no); el admin, cualquiera.
// El archivo se borra del disco solo si la base aceptó borrar la fila.
export async function borrarMaterial(_: R, fd: FormData): Promise<R> {
  const { sb } = await requireRole('profesor', 'admin')
  const { data, error } = await sb.from('materiales').delete().eq('id', txt(fd, 'id')).select('storage_path')
  if (error) return { error: 'No se pudo borrar el material.' }
  const filas = (data as { storage_path: string | null }[] | null) ?? []
  if (!filas.length) return { error: 'No tenés permiso para borrar ese material, o ya no existe.' } // RLS: el profesor solo borra el suyo
  if (filas[0].storage_path) await borrarArchivo('materiales', filas[0].storage_path)
  revalidar()
  return { ok: true }
}
