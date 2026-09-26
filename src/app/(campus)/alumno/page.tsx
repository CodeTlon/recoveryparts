import { requireAlumno } from '@/lib/auth-helpers'

export default async function AlumnoPage() {
  const { profile } = await requireAlumno()
  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-2 tracking-tight">Hola, {profile.nombre || 'alumno'}</h1>
        <p className="text-lg text-on-surface-variant">Tu cuenta ya está activa. Tus cursos y material van a aparecer acá.</p>
      </header>
      <section className="bg-surface-container-low border border-outline-variant rounded-lg p-6 md:p-8 text-on-surface-variant">
        Todavía no tenés cursos asignados.
      </section>
    </>
  )
}
