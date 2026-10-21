// Datos estructurados (schema.org) para buscadores. El JSON se arma en el servidor; se escapa `<` para que un texto del
// CMS no pueda cerrar la etiqueta <script>.
export default function JsonLd({ datos }: { datos: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, '\\u003c') }} />
}
