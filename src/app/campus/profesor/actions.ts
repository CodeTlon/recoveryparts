'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import type { R } from '../admin/actions'

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const MAX_PDF = 25 * 1024 * 1024

// RF-05: PDF al bucket privado. RLS (storage + materiales) restringe al profesor de ese curso.
export async function subirPdf(_: R, fd: FormData): Promise<R> {
  const { sb, perfil } = await requireRole('profesor', 'admin')
  const curso_id = txt(fd, 'curso_id')
  const f = fd.get('archivo') as File | null
  if (!txt(fd, 'titulo')) return { error: 'Poné un título.' }
  if (!f || !f.size) return { error: 'Elegí un PDF.' }
  if (f.size > MAX_PDF) return { error: 'El PDF supera los 25 MB.' }
  const head = new TextDecoder().decode(new Uint8Array(await f.slice(0, 5).arrayBuffer()))
  if (f.type !== 'application/pdf' || head !== '%PDF-') return { error: 'El archivo no es un PDF válido.' }

  const path = `${curso_id}/${crypto.randomUUID()}.pdf`
  const up = await sb.storage.from('materiales').upload(path, f, { contentType: 'application/pdf' })
  if (up.error) return { error: 'No se pudo subir el PDF (¿es tu curso?).' }

  const { error } = await sb.from('materiales').insert({
    curso_id, tipo: 'pdf', titulo: txt(fd, 'titulo'), storage_path: path,
    clase_id: txt(fd, 'clase_id') || null, liberar_en: txt(fd, 'liberar_en') || null, subido_por: perfil.id,
  })
  if (error) {
    await sb.storage.from('materiales').remove([path])
    return { error: 'No se pudo registrar el material.' }
  }
  revalidatePath(`/campus/profesor/curso/${curso_id}`); revalidatePath(`/campus/admin/cursos/${curso_id}`)
  return { ok: true }
}

// RF-36: videos como link (YouTube no listado / Drive). No se alojan videos.
export async function agregarLink(_: R, fd: FormData): Promise<R> {
  const { sb, perfil } = await requireRole('profesor', 'admin')
  const curso_id = txt(fd, 'curso_id'), url = txt(fd, 'url')
  if (!txt(fd, 'titulo')) return { error: 'Poné un título.' }
  try { if (!['http:', 'https:'].includes(new URL(url).protocol)) throw 0 } catch { return { error: 'Link inválido (debe empezar con https://).' } }
  const { error } = await sb.from('materiales').insert({
    curso_id, tipo: 'link', titulo: txt(fd, 'titulo'), url,
    clase_id: txt(fd, 'clase_id') || null, liberar_en: txt(fd, 'liberar_en') || null, subido_por: perfil.id,
  })
  revalidatePath(`/campus/profesor/curso/${curso_id}`)
  return error ? { error: 'No se pudo guardar el link.' } : { ok: true }
}

// RF-07 / RF-32: liberar antes de tiempo (manual) o volver a ocultar.
export async function liberarMaterial(fd: FormData) {
  const { sb } = await requireRole('profesor', 'admin')
  await sb.from('materiales').update({ liberado_manual: fd.get('liberar') === '1' }).eq('id', txt(fd, 'id'))
  revalidatePath(`/campus/profesor/curso/${txt(fd, 'curso_id')}`)
}

export async function borrarMaterial(fd: FormData) {
  const { sb } = await requireRole('profesor', 'admin')
  const { data: m } = await sb.from('materiales').select('storage_path').eq('id', txt(fd, 'id')).single()
  const { error } = await sb.from('materiales').delete().eq('id', txt(fd, 'id'))
  if (!error && m?.storage_path) await sb.storage.from('materiales').remove([m.storage_path])
  revalidatePath(`/campus/profesor/curso/${txt(fd, 'curso_id')}`)
}
