import { NextResponse, type NextRequest } from 'next/server'
import { usuarioApi } from '@/lib/auth'
import { clienteAdmin } from '@/lib/db'
import { dbConfigured } from '@/lib/env'
import { infoArchivo } from '@/lib/storage'
import { respuestaArchivo } from '@/lib/archivo-http'

// Sirve el PDF tras validar acceso: inline para la vista previa, o como descarga con ?download=1:
//  - alumno: solo si el material está liberado en una edición que cursa o que terminó hace menos de 3 meses
//    (material_visible, RF-34/37);
//  - profesor/admin: RLS sobre `materiales` (profesores que dictan una edición activa del curso).
// El archivo nunca se expone con URL pública; no se cachea.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured) return new NextResponse('Servicio no configurado', { status: 503 })
  const { id } = await params
  const u = await usuarioApi()
  if (!u) return new NextResponse('No autorizado', { status: 401 })

  const { sb, perfil: user } = u
  const { data: m } = await sb.from('materiales').select('curso_id, tipo, storage_path, titulo').eq('id', id).maybeSingle()
  let storagePath = m?.tipo === 'pdf' ? m.storage_path : null
  let titulo = 'material'
  let alumnoCurso: string | null = null
  if (!m) {
    const { data: ins } = await sb.from('inscripciones').select('edicion_id').eq('alumno_id', user.id).neq('estado', 'desertor')
    // Una consulta por inscripción, en paralelo (antes una detrás de otra).
    const visibles = await Promise.all((ins ?? []).map((i) => sb.rpc('material_visible', { p_edicion: i.edicion_id })))
    if (visibles.some(({ data: vis }) => (vis as { id: string }[] | null)?.some((v) => v.id === id))) {
      const { data } = await clienteAdmin().from('materiales').select('storage_path, tipo, titulo, curso_id').eq('id', id).single()
      if (data?.tipo === 'pdf') {
        alumnoCurso = data.curso_id // el material es del curso (lo comparten sus ediciones)
        storagePath = data.storage_path
        titulo = data.titulo
      }
    }
  }
  if (m?.titulo) titulo = m.titulo
  if (!storagePath) return new NextResponse('No encontrado', { status: 404 })
  // El archivo se lee con acceso de servidor: tiene que ser del curso del material (storage_path es editable por el profesor).
  const cursoId = m?.curso_id ?? alumnoCurso
  if (!cursoId || !storagePath.startsWith(`${cursoId}/`)) return new NextResponse('No encontrado', { status: 404 })

  const info = await infoArchivo('materiales', storagePath)
  if (!info) return new NextResponse('No encontrado', { status: 404 })
  // Streaming con Range: los visores de PDF piden tramos y no hace falta cargar hasta 25 MB en memoria.
  return respuestaArchivo(req.headers.get('range'), info, {
    'Content-Type': 'application/pdf',
    // encodeURIComponent no escapa ' ( ) * !: se escapan a mano para no romper el parámetro filename*.
    'Content-Disposition': `${req.nextUrl.searchParams.has('download') ? 'attachment' : 'inline'}; filename="material.pdf"; filename*=UTF-8''${encodeURIComponent(titulo).replace(/['()*!]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())}.pdf`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
}
