// Título que entra «expandiéndose»: cada palabra pasa de Archivo comprimido al ancho final con una máscara que la
// destapa (keyframes `expandir` en globals.css). Sin JS: es una <span> por palabra con su índice. El texto completo
// queda en el HTML, así que lectores de pantalla y buscadores lo leen entero; con reduced-motion no se anima.
export default function TituloExpandido({ texto, as: Tag = 'h1', className = '' }: { texto: string; as?: 'h1' | 'h2'; className?: string }) {
  const palabras = texto.split(/\s+/).filter(Boolean)
  return (
    <Tag className={`display titulo-expandido ${className}`}>
      {palabras.map((p, i) => (
        <span key={i} style={{ '--i': i } as React.CSSProperties}>{p}{i < palabras.length - 1 ? ' ' : ''}</span>
      ))}
    </Tag>
  )
}
