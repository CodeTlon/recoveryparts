import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Sirve un PDF del bucket privado tras validar el acceso con las políticas RLS de `materiales`:
//  - alumno: solo si está liberado y su matrícula está activa;
//  - profesor/administrador: los materiales de sus cursos.
// El archivo nunca se expone con una URL pública. `?download=1` fuerza la descarga.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return new NextResponse('No encontrado', { status: 404 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  // Si RLS no deja ver la fila, no hay acceso (se responde 404 para no revelar que existe).
  const { data: m } = await supabase.from('materiales').select('titulo, tipo, storage_path').eq('id', Number(id)).maybeSingle()
  if (!m || m.tipo !== 'pdf' || !m.storage_path) return new NextResponse('No encontrado', { status: 404 })

  const { data: file, error } = await createAdminClient().storage.from('materiales').download(m.storage_path)
  if (error || !file) return new NextResponse('No encontrado', { status: 404 })

  const nombre = encodeURIComponent(`${m.titulo}.pdf`)
  return new NextResponse(file, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${req.nextUrl.searchParams.has('download') ? 'attachment' : 'inline'}; filename*=UTF-8''${nombre}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
