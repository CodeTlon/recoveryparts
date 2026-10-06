'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import type { R } from '../admin/actions'

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const MAX_PDF = 25 * 1024 * 1024
const revalidar = () => { revalidatePath('/campus', 'layout') }

// El material es del curso (lo comparten sus ediciones) y se asocia a una CLASE del curso (por id: si la clase cambia
// de lugar, el material la sigue) o queda «general». Lo cargan el admin y los profesores que dictan una edición activa
// del curso (RLS). En cada edición el alumno lo ve solo cuando el profesor lo libera (RF-32: siempre a mano); la
// liberación es de la edición del profesor.
async function validarMaterial(sb: Awaited<ReturnType<typeof requireRole>>['sb'], fd: FormData): Promise<{ error: string } | { curso_id: string; titulo: string; plan_clase_id: string | null }> {
  const curso_id = txt(fd, 'curso_id'), titulo = txt(fd, 'titulo'), plan_clase_id = txt(fd, 'plan_clase_id') || null
  if (!titulo || titulo.length > 200) return { error: 'Poné un título de hasta 200 caracteres.' }
  if (plan_clase_id) {
    const { data } = await sb.from('plan_clases').select('id').eq('curso_id', curso_id).eq('id', plan_clase_id).maybeSingle()
    if (!data) return { error: 'Esa clase no es de este curso.' }
  }
  return { curso_id, titulo, plan_clase_id }
}

// Si se tildó «liberar ya en esta edición», se registra la liberación manual en esa edición.
async function liberarSiCorresponde(sb: Awaited<ReturnType<typeof requireRole>>['sb'], fd: FormData, material_id: string) {
  const edicion_id = txt(fd, 'edicion_id')
  if (edicion_id && fd.get('liberar_ya') === 'on') await sb.from('materiales_liberados').insert({ edicion_id, material_id })
}

// RF-05: PDF al bucket privado. RLS (storage + materiales) restringe a los profesores del curso.
export async function subirPdf(_: R, fd: FormData): Promise<R> {
  const { sb, perfil } = await requireRole('profesor', 'admin')
  const v = await validarMaterial(sb, fd)
  if ('error' in v) return v
  const f = fd.get('archivo') as File | null
  if (!f || !f.size) return { error: 'Elegí un PDF.' }
  if (f.size > MAX_PDF) return { error: 'El PDF supera los 25 MB.' }
  const head = new TextDecoder().decode(new Uint8Array(await f.slice(0, 5).arrayBuffer()))
  if (f.type !== 'application/pdf' || head !== '%PDF-') return { error: 'El archivo no es un PDF válido.' }

  const path = `${v.curso_id}/${crypto.randomUUID()}.pdf`
  const up = await sb.storage.from('materiales').upload(path, f, { contentType: 'application/pdf' })
  if (up.error) return { error: 'No se pudo subir el PDF (¿dictás este curso?).' }

  const { data, error } = await sb.from('materiales').insert({ ...v, tipo: 'pdf', storage_path: path, subido_por: perfil.id }).select('id').single()
  if (error || !data) {
    await sb.storage.from('materiales').remove([path])
    return { error: 'No se pudo registrar el material.' }
  }
  await liberarSiCorresponde(sb, fd, data.id)
  revalidar()
  return { ok: true }
}

// RF-36: videos como link (YouTube no listado / Drive). No se alojan videos.
export async function agregarLink(_: R, fd: FormData): Promise<R> {
  const { sb, perfil } = await requireRole('profesor', 'admin')
  const v = await validarMaterial(sb, fd)
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
export async function liberarMaterial(fd: FormData) {
  const { sb } = await requireRole('profesor', 'admin')
  const edicion_id = txt(fd, 'edicion_id'), material_id = txt(fd, 'id')
  if (fd.get('liberar') === '1') await sb.from('materiales_liberados').upsert({ edicion_id, material_id }, { onConflict: 'edicion_id,material_id' })
  else await sb.from('materiales_liberados').delete().eq('edicion_id', edicion_id).eq('material_id', material_id)
  revalidar()
}

// Borra el material del curso (deja de verse en todas sus ediciones).
export async function borrarMaterial(fd: FormData) {
  const { sb } = await requireRole('profesor', 'admin')
  const { data: m } = await sb.from('materiales').select('storage_path').eq('id', txt(fd, 'id')).single()
  const { error } = await sb.from('materiales').delete().eq('id', txt(fd, 'id'))
  if (!error && m?.storage_path) await sb.storage.from('materiales').remove([m.storage_path])
  revalidar()
}
