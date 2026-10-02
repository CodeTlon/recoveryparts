import Link from 'next/link'
import AuroraBackground from '@/components/ui/AuroraBackground'

export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6 text-center">
      <AuroraBackground />
      <div className="relative">
        <p className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-8xl font-black tracking-tighter text-transparent">404</p>
        <h1 className="mt-4 text-2xl font-bold">No encontramos esa página</h1>
        <p className="mt-2 text-on-surface-variant">Puede que el enlace haya cambiado o que ya no exista.</p>
        <Link href="/" className="btn-primary mt-8 inline-flex">Volver al inicio</Link>
      </div>
    </main>
  )
}
