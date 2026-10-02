import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import AuroraBackground from '@/components/ui/AuroraBackground'

export default function AuthShell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-surface text-on-surface lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca: solo en pantallas grandes */}
      <aside className="relative hidden overflow-hidden border-r border-outline-variant lg:flex lg:flex-col lg:justify-between lg:p-12">
        <AuroraBackground />
        <Link href="/" className="relative flex items-center gap-3 text-sm font-bold uppercase tracking-tighter">
          <Image src="/images/logo.png" alt="" width={36} height={36} /> Recovery Parts
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">Aprendé un oficio con <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">equipos reales</span>.</h2>
          <p className="mt-4 text-on-surface-variant">Tu campus: clases, material y seguimiento de tus cursos en un solo lugar.</p>
        </div>
      </aside>

      <div className="grid-bg flex items-center justify-center p-6 lg:bg-none">
        <div className="w-full max-w-sm animate-fade-up">
          <Link href="/" className="mb-8 flex w-fit items-center gap-2 text-sm text-on-surface-variant hover:text-secondary"><ArrowLeft size={16} /> Volver al sitio</Link>
          <Image src="/images/logo.png" alt="Recovery Parts" width={64} height={64} className="mb-6 h-16 w-16 lg:hidden" />
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</span>
          <h1 className="mt-1 text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mb-8 mt-1 text-sm text-on-surface-variant">{subtitle}</p>}
          {!subtitle && <div className="mb-8" />}
          {children}
        </div>
      </div>
    </main>
  )
}
