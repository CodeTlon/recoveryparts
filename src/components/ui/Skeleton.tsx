// Bloque de carga con brillo que barre. Usa la animación `shimmer` de tailwind.config.ts.
export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`relative overflow-hidden rounded-card bg-surface-container-high ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-on-surface/10 to-transparent" />
    </div>
  )
}
