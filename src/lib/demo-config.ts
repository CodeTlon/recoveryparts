// ============================================================
// CONFIG DE MARCA — Recovery Parts
// Solo identidad visual y datos básicos del negocio. El contenido del sitio
// (cursos, precios, FAQ, etc.) sale de la base de datos (CMS), no de acá.
// Lenguaje visual mapeado del DESIGN.md de Stitch:
//   "Industrial Technical Narrative" — dark-mode, navy + naranja,
//   bordes 1px tipo CAD, radio 4px, tipografía Montserrat.
// ============================================================

export const demoConfig = {

  // ── Información del negocio ──────────────────────────────
  business: {
    name: 'Recovery Parts',
    tagline: 'Capacitación técnica 100% práctica en Córdoba',
    phone: '+54 9 351 233-6810',
    email: 'info@recoveryparts.com.ar',
    address: 'La Rioja 345, X5022 Córdoba',
    whatsapp: '5493512336810',   // sin + ni espacios
    instagram: '@recoveryparts',
  },

  // ── Identidad visual — dark industrial (del DESIGN.md) ───
  brand: {
    background:   '#08132a',   // navy profundo (surface base)
    surface:      '#101b33',   // cards / secciones alternas
    surfaceAlt:   '#151f37',   // segundo tono (cards destacadas, inputs)
    heading:      '#ffffff',   // títulos high-emphasis
    text:         '#d9e2ff',   // body (on-surface)
    muted:        '#9aa6c4',   // texto secundario (slate)
    border:       'rgba(185,199,228,0.18)', // 1px slate ~20% (look CAD)
    accent:       '#ff6b35',   // naranja industrial (CTA, highlights)
    onAccent:     '#0a192f',   // texto sobre el naranja
    structural:   '#030d25',   // banda más oscura (navbar / footer / stats)
    onStructural: '#d9e2ff',
    font: 'Montserrat',
  },

  // ── Lenguaje visual ──────────────────────────────────────
  style: {
    theme:  'dark' as 'light' | 'dark',
    radius: 'sharp' as 'sharp' | 'soft' | 'round', // 4px soft-industrial
    cards:  'border' as 'shadow' | 'border' | 'glass', // 1px en vez de sombras
  },
}

export type DemoConfig = typeof demoConfig
