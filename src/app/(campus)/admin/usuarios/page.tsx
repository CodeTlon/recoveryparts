import { requireAdmin } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { InvitarUsuarioForm } from '@/components/campus/InvitarUsuarioForm'

const ROL_LABEL: Record<string, string> = { alumno: 'Alumno', profesor: 'Profesor', administrador: 'Admin' }

export default async function UsuariosPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: usuarios } = await supabase
    .from('profiles')
    .select('id, nombre, email, rol, cuenta_activa, created_at')
    .order('created_at', { ascending: false })

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 tracking-tight">Usuarios</h1>
        <p className="text-lg text-on-surface-variant">Invitá profesores y alumnos por email.</p>
      </header>

      <section className="mb-12">
        <InvitarUsuarioForm />
      </section>

      <section className="bg-surface-container-low border border-outline-variant rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
              <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Nombre</th>
              <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Email</th>
              <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Rol</th>
              <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(usuarios ?? []).map((u) => (
              <tr key={u.id} className="border-t border-outline-variant text-on-surface">
                <td className="px-4 py-3 md:px-6 md:py-4 font-medium">{u.nombre || '—'}</td>
                <td className="px-4 py-3 md:px-6 md:py-4 text-on-surface-variant">{u.email}</td>
                <td className="px-4 py-3 md:px-6 md:py-4 text-on-surface-variant">{ROL_LABEL[u.rol] ?? u.rol}</td>
                <td className="px-4 py-3 md:px-6 md:py-4">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${u.cuenta_activa ? 'bg-accent text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {u.cuenta_activa ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
            {!usuarios?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-on-surface-variant">
                  Todavía no hay usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )
}
