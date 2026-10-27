// Adaptado de react-bits/BlurText: el título entra palabra por palabra con desenfoque. Es CSS puro (`.blur-text` en
// globals.css), así que sale animado desde el HTML del servidor sin esperar al JS. No parte de opacity 0: el texto es
// legible desde el primer frame (importa para el LCP del h1) y solo se enfoca y sube. Con reduced-motion queda estático.
export default function BlurText({ text, as: Tag = 'h1', delay = 70, className = '' }: {
  text: string; as?: 'h1' | 'h2' | 'p'; delay?: number; className?: string
}) {
  const words = text.split(' ')
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="blur-text inline-block" style={{ animationDelay: `${(i * delay) / 1000}s` }}>
          {w}{i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}
