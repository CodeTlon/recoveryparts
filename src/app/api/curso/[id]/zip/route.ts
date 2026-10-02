import { NextResponse, type NextRequest } from 'next/server'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/env'
import { createAdminClient } from '@/lib/supabase/admin'

// RF-35: ZIP con todos los PDFs, solo para alumnos que TERMINARON el curso (no desertores).
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured) return new NextResponse('Servicio no configurado', { status: 503 })
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { data: ins } = await sb.from('inscripciones').select('estado').eq('curso_id', id).eq('alumno_id', user.id).maybeSingle()
  if (ins?.estado !== 'finalizado') return new NextResponse('No disponible', { status: 403 })

  const adm = createAdminClient()
  const { data: curso } = await adm.from('cursos').select('nombre, activo').eq('id', id).single()
  if (!curso?.activo) return new NextResponse('El curso ya no está disponible', { status: 410 })
  const { data: mats } = await adm.from('materiales').select('titulo, storage_path').eq('curso_id', id).eq('tipo', 'pdf')

  const zip = new JSZip()
  let i = 1
  for (const m of mats ?? []) {
    const { data } = await adm.storage.from('materiales').download(m.storage_path!)
    if (data) zip.file(`${String(i++).padStart(2, '0')} - ${m.titulo.replace(/[\\/:*?"<>|]/g, '_')}.pdf`, await data.arrayBuffer())
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
