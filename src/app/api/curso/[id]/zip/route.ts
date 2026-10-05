import { NextResponse, type NextRequest } from 'next/server'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/env'
import { createAdminClient } from '@/lib/supabase/admin'

// RF-35: ZIP con los PDFs ya liberados EN ESA EDICIÓN (mismo criterio que material_visible), solo para alumnos
// que la terminaron (no desertores). El id de la ruta es el de la edición.
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured) return new NextResponse('Servicio no configurado', { status: 503 })
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { data: ins } = await sb.from('inscripciones').select('estado').eq('edicion_id', id).eq('alumno_id', user.id).maybeSingle()
  if (ins?.estado !== 'finalizado') return new NextResponse('No disponible', { status: 403 })

  const adm = createAdminClient()
  const { data: ed } = await adm.from('ediciones').select('activo, curso_id, cursos(nombre, activo)').eq('id', id).single()
  const curso = ed?.cursos as unknown as { nombre: string; activo: boolean } | null
  if (!ed?.activo || !curso?.activo) return new NextResponse('El curso ya no está disponible', { status: 410 })
  // La regla de liberación la aplica la base con la sesión del alumno; el service role solo descarga los archivos.
  const { data: vis } = await sb.rpc('material_visible', { p_edicion: id })
  const ids = ((vis ?? []) as { id: string; tipo: string }[]).filter((v) => v.tipo === 'pdf').map((v) => v.id)
  const { data: mats } = ids.length ? await adm.from('materiales').select('titulo, storage_path').in('id', ids).order('clase_numero', { nullsFirst: true }).order('creado_en') : { data: [] }

  const zip = new JSZip()
  let i = 1
  for (const m of mats ?? []) {
    if (!m.storage_path?.startsWith(`${ed.curso_id}/`)) continue
    const { data } = await adm.storage.from('materiales').download(m.storage_path)
    if (!data) return new NextResponse('No se pudo armar el ZIP. Probá de nuevo.', { status: 502 })
    zip.file(`${String(i++).padStart(2, '0')} - ${m.titulo.replace(/[\\/:*?"<>|]/g, '_')}.pdf`, await data.arrayBuffer())
  }
  const buf = await zip.generateAsync({ type: 'uint8array' })
  return new NextResponse(Buffer.from(buf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${curso.nombre.replace(/[^\w-]+/g, '_')}.zip"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
