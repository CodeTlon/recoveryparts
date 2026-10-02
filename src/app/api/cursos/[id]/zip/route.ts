import { NextResponse, type NextRequest } from 'next/server'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// RF-35: ZIP con los PDFs liberados, solo para alumnos que TERMINARON el curso (no desertores).
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return new NextResponse('No encontrado', { status: 404 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { data: mat } = await supabase.from('matriculas').select('estado').eq('curso_id', Number(id)).eq('alumno_id', user.id).maybeSingle()
  if (mat?.estado !== 'finalizado') return new NextResponse('No disponible', { status: 403 })

  const admin = createAdminClient()
  const { data: curso } = await admin.from('cursos').select('titulo, estado').eq('id', Number(id)).maybeSingle()
  if (!curso || curso.estado === 'de_baja') return new NextResponse('El curso ya no está disponible', { status: 410 })

  const { data: mats } = await admin.from('materiales').select('titulo, storage_path')
    .eq('curso_id', Number(id)).eq('tipo', 'pdf').not('storage_path', 'is', null).lte('liberado_en', new Date().toISOString())

  const zip = new JSZip()
  let i = 1
  for (const m of mats ?? []) {
    const { data } = await admin.storage.from('materiales').download(m.storage_path!)
    if (data) zip.file(`${String(i++).padStart(2, '0')} - ${m.titulo.replace(/[\\/:*?"<>|]/g, '_')}.pdf`, await data.arrayBuffer())
  }
  if (i === 1) return new NextResponse('Este curso no tiene PDFs para descargar', { status: 404 })

  const buf = await zip.generateAsync({ type: 'uint8array' })
  return new NextResponse(Buffer.from(buf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${curso.titulo.replace(/[^\w-]+/g, '_')}.zip"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
