// Título que entra «expandiéndose»: cada palabra pasa de Archivo comprimido al ancho final (keyframes `expandir` en
// globals.css). Sin JS. Por palabra hay dos copias: una transparente que ocupa el ancho FINAL (es la que leen lectores
// de pantalla y buscadores, y fija el layout: nada de abajo se mueve mientras se anima, CLS 0) y otra encima,
// aria-hidden, que es la que se anima. Con reduced-motion se ve quieta en su ancho final.
export default function TituloExpandido({ texto, as: Tag = 'h1', className = '' }: { texto: string; as?: 'h1' | 'h2'; className?: string }) {
  const palabras = texto.split(/\s+/).filter(Boolean)
  return (
    <Tag className={`display titulo-expandido ${className}`}>
      {palabras.map((p, i) => (
        <span key={i} className="relative inline-block">
          <span className="text-transparent">{p}</span>
          <span aria-hidden className="titulo-palabra absolute left-0 top-0 whitespace-nowrap" style={{ '--i': i } as React.CSSProperties}>{p}</span>
          {i < palabras.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}
