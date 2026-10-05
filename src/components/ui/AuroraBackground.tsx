// Fondo "aurora" en CSS puro con los colores de marca: sin WebGL, sin JS, no pesa en Lighthouse.
// Se posiciona absoluto: el contenedor padre debe ser `relative overflow-hidden`.
export default function AuroraBackground({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="absolute -left-1/4 -top-1/3 h-[70%] w-[70%] rounded-full bg-brand-light/30 blur-[120px] motion-safe:animate-pulse" />
      <div className="absolute -right-1/4 top-1/4 h-[60%] w-[55%] rounded-full bg-accent/20 blur-[130px]" />
      <div className="absolute bottom-[-30%] left-1/3 h-[50%] w-[50%] rounded-full bg-brand/40 blur-[120px]" />
      <div className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
    </div>
  )
}
