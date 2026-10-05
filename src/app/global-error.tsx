'use client'

// Último recurso: se muestra si falla el layout raíz, así que no depende de estilos ni componentes.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-AR">
      <body style={{ background: '#08132a', color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0, textAlign: 'center' }}>
        <div role="alert">
          <h1>Algo salió mal</h1>
          <p>Probá de nuevo en unos segundos.</p>
          <button onClick={reset} style={{ padding: '10px 20px', background: '#f97316', color: '#08132a', border: 0, fontWeight: 700, cursor: 'pointer' }}>Reintentar</button>
        </div>
      </body>
    </html>
  )
}
