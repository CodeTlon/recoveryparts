// Título de sección: etiqueta chica, título con palabra acentuada (<em>) y barra decorativa.
export default function SectionTitle({ eyebrow, children, align = 'left', className = '' }: {
  eyebrow?: string; children: React.ReactNode; align?: 'left' | 'center'; className?: string
}) {
  const center = align === 'center'
  return (
    <div className={`mb-10 ${center ? 'text-center' : ''} ${className}`}>
      {eyebrow && <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</span>}
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl [&_em]:not-italic [&_em]:text-accent">{children}</h2>
      <span aria-hidden className={`mt-4 block h-1 w-14 rounded-full bg-gradient-to-r from-accent to-secondary ${center ? 'mx-auto' : ''}`} />
    </div>
  )
}
