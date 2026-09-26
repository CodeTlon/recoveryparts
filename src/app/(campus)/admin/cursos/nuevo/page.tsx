import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { CursoForm } from '@/components/campus/CursoForm'
import { crearCursoAction } from '@/lib/actions/cursos'

export default async function NuevoCursoPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: profesores } = await supabase.from('profiles').select('id, nombre, apellido').eq('rol', 'profesor').order('nombre')

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">Nuevo curso</h1>
        <p className="text-lg text-on-surface-variant">El calendario de clases se genera automáticamente al crear el curso.</p>
      </header>
      {!profesores?.length ? (
        <p className="text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg p-6">
          Todavía no hay profesores cargados. Invitá uno primero desde <a href="/admin/usuarios" className="text-secondary hover:underline">Usuarios</a>.
        </p>
      ) : (
        <div className="max-w-3xl bg-surface-container-low border border-outline-variant rounded-lg p-6 md:p-8">
          <CursoForm action={crearCursoAction} profesores={profesores} submitLabel="Crear curso" />
        </div>
      )}
    </>
  )
}
