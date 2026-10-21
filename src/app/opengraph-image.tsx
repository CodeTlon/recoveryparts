import { ImageResponse } from 'next/og'

// Imagen por defecto al compartir el sitio (WhatsApp, redes). Los colores son los tokens de globals.css.
export const alt = 'Recovery Parts — Academia de cursos técnicos en Córdoba'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 96px', background: '#08132a', color: '#e6e8ee' }}>
        <div style={{ width: 96, height: 8, background: '#f97316', marginBottom: 40 }} />
        <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>Recovery Parts</div>
        <div style={{ fontSize: 40, marginTop: 28, color: '#f97316', fontWeight: 700 }}>Academia de cursos técnicos</div>
        <div style={{ fontSize: 32, marginTop: 16, color: '#b8bdcb' }}>Cursos y talleres presenciales en Córdoba</div>
      </div>
    ),
    size,
  )
}
