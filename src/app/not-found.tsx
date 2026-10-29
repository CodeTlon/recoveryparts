import Link from 'next/link'
import CircuitField from '@/components/ui/CircuitField'

// 404: el circuito sigue vivo de fondo y el número se arma con la misma animación de ancho que los títulos.
export default function NotFound() {
  return (
    <main id="contenido" tabIndex={-1} className="relative grid min-h-screen place-items-center overflow-hidden px-6 text-center">
      <CircuitField modo="hero" />
      <div className="relative">
        <p aria-hidden className="display titulo-expandido text-[clamp(6rem,24vw,13rem)] leading-none text-accent"><span className="titulo-palabra inline-block">404</span></p>
        <h1 className="display mt-4 text-3xl [font-stretch:105%]">No encontramos esa página</h1>
        <p className="mt-3 text-on-surface-variant">Puede que el enlace haya cambiado o que ya no exista.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">Volver al inicio</Link>
          <Link href="/cursos" className="btn-outline">Ver cursos</Link>
        </div>
      </div>
    </main>
  )
}
