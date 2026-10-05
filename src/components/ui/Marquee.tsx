// Cinta horizontal infinita en CSS puro (inspirada en LogoLoop / 3d-testimonials de la biblioteca).
// Pausa al pasar el mouse o con foco, y se detiene con prefers-reduced-motion (ver globals.css).
export default function Marquee({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`group relative overflow-hidden motion-reduce:[mask-image:none] [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] ${className}`}>
      <div className="flex w-max animate-marquee gap-6 motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:animate-none group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
        <div className="flex shrink-0 gap-6 motion-reduce:flex-wrap">{children}</div>
        <div aria-hidden className="flex shrink-0 gap-6 motion-reduce:hidden">{children}</div>
      </div>
    </div>
  )
}
