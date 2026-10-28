import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import CircuitField from '@/components/ui/CircuitField'
import TituloExpandido from '@/components/ui/TituloExpandido'

// Pantallas de acceso (login, activar, olvidé): panel de marca con el circuito vivo a la izquierda (solo en pantallas
// grandes) y el formulario a la derecha. `eyebrow` es el contexto chico arriba del título (p. ej. «Campus»).
export default function AuthShell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main id="contenido" tabIndex={-1} className="grid min-h-screen bg-surface text-on-surface lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-outline-variant bg-surface-container-lowest lg:flex lg:flex-col lg:justify-between lg:p-12">
        <CircuitField modo="hero" />
        <Link href="/" className="relative flex w-fit items-center gap-3">
          <Image src="/images/logo.png" alt="" width={40} height={40} /> <span className="display text-xl">Recovery Parts</span>
        </Link>
        <div className="relative max-w-lg">
          <TituloExpandido as="h2" texto="Aprendé un oficio con equipos reales." className="text-5xl" />
          <p className="mt-5 text-lg text-on-surface-variant">Tu campus: clases, material y seguimiento de tus cursos en un solo lugar.</p>
        </div>
      </aside>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm motion-safe:animate-[menu-entra_0.6s_var(--ease-out)_both]">
          <Link href="/" className="mb-10 flex w-fit items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface"><ArrowLeft size={16} aria-hidden /> Volver al sitio</Link>
          <Image src="/images/logo.png" alt="Recovery Parts" width={64} height={64} priority className="mb-6 h-14 w-14 lg:hidden" />
          <span className="dato text-accent">{eyebrow}</span>
          <h1 className="display mt-2 text-3xl [font-stretch:108%]">{title}</h1>
          {subtitle && <p className="mb-8 mt-2 text-sm text-on-surface-variant">{subtitle}</p>}
          {!subtitle && <div className="mb-8" />}
          {children}
        </div>
      </div>
    </main>
  )
}
