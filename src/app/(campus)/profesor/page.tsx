import { requireProfesor } from '@/lib/auth-helpers'

export default async function ProfesorPage() {
  const { profile } = await requireProfesor()
  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-2 tracking-tight">Hola, {profile.nombre || 'profesor'}</h1>
        <p className="text-lg text-on-surface-variant">Tus cursos asignados van a aparecer acá.</p>
      </header>
      <section className="bg-surface-container-low border border-outline-variant rounded-lg p-6 md:p-8 text-on-surface-variant">
        Todavía no tenés cursos asignados.
      </section>
    </>
  )
}
