import Link from 'next/link'

// notFound() dentro del campus: queda dentro del shell en vez de mandar al sitio público.
export default function CampusNotFound() {
  return (
    <div className="card mx-auto mt-16 flex max-w-md flex-col items-center gap-4 p-10 text-center">
      <p className="text-6xl font-black text-accent">404</p>
      <h1 className="text-xl font-bold">No encontramos esa página</h1>
      <p className="text-on-surface-variant">Puede que ya no exista o que no tengas acceso.</p>
      <Link href="/campus" className="btn-primary">Volver al campus</Link>
    </div>
  )
}
