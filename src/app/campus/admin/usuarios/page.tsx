import Link from 'next/link'
import Reveal from '@/components/ui/Reveal'
import { requireRole } from '@/lib/auth'
import { ActionForm, Badge, Empty, Field, PageHead, Select, SubmitButton } from '@/components/campus/ui'
import { actualizarPerfil, cambiarEmail, crearUsuario, reenviarInvitacion, setEstadoCuenta } from '../actions'

const ESTADO = { pendiente_activacion: ['warn', 'Pendiente'], activa: ['ok', 'Activa'], inactiva: ['bad', 'Inactiva'] } as const

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ rol?: string; q?: string }> }) {
  const { rol, q } = await searchParams
  const { sb, perfil } = await requireRole('admin')
  let query = sb.from('profiles').select('*').order('apellido')
  if (rol) query = query.eq('rol', rol)
  if (q) query = query.or(`nombre.ilike.%${q.replace(/[%,()]/g, '')}%,apellido.ilike.%${q.replace(/[%,()]/g, '')}%,email.ilike.%${q.replace(/[%,()]/g, '')}%`)
  const { data: users } = await query

  const tab = (v: string | undefined, l: string) => (
    <Link href={v ? `?rol=${v}` : '?'} className={`rounded border px-4 py-2 text-sm font-semibold ${rol === v || (!rol && !v) ? 'border-accent bg-accent text-surface' : 'border-outline-variant text-on-surface-variant hover:border-secondary'}`}>{l}</Link>
  )

  return (
    <>
      <PageHead title="Usuarios" sub="Solo vos podés crear usuarios. Cada uno recibe un mail para crear su propia contraseña (el link vence en 24 h)." />

      <details className="card mb-8 p-6" open={!users?.length}>
        <summary className="cursor-pointer font-semibold">Crear usuario</summary>
        <div className="mt-4 max-w-2xl">
          <ActionForm action={crearUsuario} submit="Crear y enviar invitación">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" name="nombre" placeholder="Ej: María" required />
              <Field label="Apellido" name="apellido" placeholder="Ej: González" required />
              <Field label="Email" name="email" placeholder="nombre@ejemplo.com" type="email" required />
              <Field label="Teléfono" name="telefono" placeholder="Ej: 351 123 4567" type="tel" />
            </div>
            <Select name="rol" label="Rol" defaultValue="alumno" options={[['alumno', 'Alumno'], ['profesor', 'Profesor']]} />
            <p className="text-xs text-on-surface-variant">Solo se piden nombre, apellido, email y teléfono. Los alumnos también se pueden crear desde el curso, ya vinculados.</p>
          </ActionForm>
        </div>
      </details>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tab(undefined, 'Todos')}{tab('alumno', 'Alumnos')}{tab('profesor', 'Profesores')}{tab('admin', 'Admins')}
        <form className="ml-auto"><input name="q" defaultValue={q} placeholder="Buscar…" aria-label="Buscar usuarios" className="input !py-2" />{rol && <input type="hidden" name="rol" value={rol} />}</form>
      </div>

      {!users?.length ? <Empty>No hay usuarios.</Empty> : (
        <ul className="space-y-3">
          {users.map((u) => {
            const [tone, label] = ESTADO[u.estado_cuenta as keyof typeof ESTADO]
            return (
              <Reveal key={u.id} y={8}>
              <li className="card p-4 transition-colors hover:border-outline">
                <div className="flex flex-wrap items-center gap-3">
                  <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-light to-accent text-sm font-bold text-white">{`${u.nombre?.[0] ?? ''}${u.apellido?.[0] ?? ''}`.toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{u.apellido}, {u.nombre} <span className="ml-2 text-xs font-normal uppercase text-on-surface-variant">{u.rol}</span></p>
                    <p className="truncate text-sm text-on-surface-variant">{u.email}{u.telefono ? ` · ${u.telefono}` : ''}</p>
                  </div>
                  <Badge tone={tone as 'ok'}>{label}</Badge>
                  {u.estado_cuenta === 'pendiente_activacion' && (
                    <form action={reenviarInvitacion}><input type="hidden" name="id" value={u.id} /><SubmitButton>Reenviar invitación</SubmitButton></form>
                  )}
                  {u.id !== perfil.id && u.estado_cuenta !== 'pendiente_activacion' && (
                    <form action={setEstadoCuenta}>
                      <input type="hidden" name="id" value={u.id} /><input type="hidden" name="estado" value={u.estado_cuenta === 'activa' ? 'inactiva' : 'activa'} />
                      <SubmitButton>{u.estado_cuenta === 'activa' ? 'Deshabilitar cuenta' : 'Reactivar cuenta'}</SubmitButton>
                    </form>
                  )}
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-secondary">Editar</summary>
                  <div className="mt-4 grid gap-6 lg:grid-cols-2">
                    <ActionForm action={actualizarPerfil} reset={false} submit="Guardar datos">
                      <input type="hidden" name="id" value={u.id} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nombre" name="nombre" placeholder="Ej: María" defaultValue={u.nombre} required /><Field label="Apellido" name="apellido" placeholder="Ej: González" defaultValue={u.apellido} required />
                      </div>
                      <Field label="Teléfono" name="telefono" placeholder="Ej: 351 123 4567" defaultValue={u.telefono} />
                      {u.rol === 'profesor' && <>
                        <Field label="Foto (URL)" name="foto_url" placeholder="https://…/foto.jpg" defaultValue={u.foto_url} hint="Subí la imagen en Sitio web › Imágenes y pegá la URL." />
                        <Field label="Experiencia" name="experiencia" placeholder="Contá brevemente su trayectoria" rows={3} defaultValue={u.experiencia} />
                        <Field label="Certificaciones" name="certificaciones" placeholder="Una por línea" rows={2} defaultValue={u.certificaciones} />
                      </>}
                    </ActionForm>
                    <ActionForm action={cambiarEmail} reset={false} submit="Cambiar email">
                      <input type="hidden" name="id" value={u.id} />
                      <Field label="Email nuevo" name="email" placeholder="nombre@ejemplo.com" type="email" defaultValue={u.email} required hint="Se reenvía la verificación al email nuevo." />
                    </ActionForm>
                  </div>
                </details>
              </li>
              </Reveal>
            )
          })}
        </ul>
      )}
    </>
  )
}
