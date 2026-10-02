import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

export default function AuthShell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="grid-bg flex min-h-screen items-center justify-center bg-surface p-6 text-on-surface">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-secondary"><ArrowLeft size={16} /> Volver al sitio</Link>
        <Image src="/images/logo.png" alt="Recovery Parts" width={64} height={64} className="mb-6 h-16 w-16" />
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</span>
        <h1 className="mt-1 text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mb-8 mt-1 text-sm text-on-surface-variant">{subtitle}</p>}
        {!subtitle && <div className="mb-8" />}
        {children}
      </div>
    </main>
  )
}
