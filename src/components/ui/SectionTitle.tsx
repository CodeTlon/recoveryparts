// Título de sección: una pista de circuito (con su nodo) que se dibuja al entrar la sección en pantalla — animación
// atada al scroll, sin JS (`.pista-trazo` en globals.css) — y el título en Archivo expandido. `bajada`: texto opcional.
export default function SectionTitle({ children, bajada, align = 'left', className = '', id }: {
  children: React.ReactNode; bajada?: React.ReactNode; align?: 'left' | 'center'; className?: string; id?: string
}) {
  const center = align === 'center'
  return (
    <div className={`mb-10 md:mb-12 ${center ? 'text-center' : ''} ${className}`}>
      <svg aria-hidden viewBox="0 0 120 20" className={`mb-5 h-5 w-30 text-accent ${center ? 'mx-auto' : ''}`} fill="none">
        <path pathLength={1} className="pista-trazo" d="M2 10 H48 L58 2 H104" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle className="pista-nodo" cx="108.5" cy="2" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="2" cy="10" r="1.75" fill="currentColor" />
      </svg>
      <h2 id={id} className="display text-[clamp(1.9rem,4.2vw,3.1rem)]">{children}</h2>
      {bajada && <p className={`mt-4 max-w-2xl text-lg text-on-surface-variant ${center ? 'mx-auto' : ''}`}>{bajada}</p>}
    </div>
  )
}
