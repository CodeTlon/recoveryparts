import type { Cliente } from '@/lib/db'
import { PageHead } from '@/components/campus/ui'
import { CambiarContrasenaForm } from '@/components/auth/AuthForms'

// «Mi cuenta» (los tres roles): los datos que la academia tiene del usuario, en solo lectura (RF-57: nombre,
// apellido, email y teléfono; los carga y corrige el admin), y el cambio de contraseña.
// Se lee con el cliente del usuario: RLS solo devuelve su propio perfil.
export default async function MiCuenta({ sb, userId }: { sb: Cliente; userId: string }) {
  const { data } = await sb.from('profiles').select('nombre, apellido, email, telefono').eq('id', userId).maybeSingle()
  const p = (data ?? {}) as { nombre?: string; apellido?: string; email?: string; telefono?: string | null }
  const datos: [string, string][] = [['Nombre', p.nombre || '—'], ['Apellido', p.apellido || '—'], ['Email', p.email || '—'], ['Teléfono', p.telefono || '—']]

  return (
    <>
      <PageHead title="Mi cuenta" sub="Tus datos y tu contraseña." />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 text-xl font-semibold">Mis datos</h2>
          <dl className="space-y-3">
            {datos.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wider text-on-surface-variant">{k}</dt>
                <dd className="break-words font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm text-on-surface-variant">Si algún dato está mal, avisale a la academia para que lo corrija.</p>
        </section>
        <section className="card p-6">
          <h2 className="mb-1 text-xl font-semibold">Cambiar contraseña</h2>
          <p className="mb-4 text-sm text-on-surface-variant">Al cambiarla se cierran tus otras sesiones abiertas.</p>
          <CambiarContrasenaForm />
        </section>
      </div>
    </>
  )
}
