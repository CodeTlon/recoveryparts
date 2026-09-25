// ============================================================
// CONFIG DE LA DEMO — Recovery Parts (capacitación técnica)
// Demo de outreach (L0). Editar solo este archivo.
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

  // ── Imágenes (todas locales) ─────────────────────────────
  images: {
    hero:  '/images/hero.jpg',
    about: '/images/about.jpg',
    gallery: [
      '/images/curso-iphone.jpg',
      '/images/curso-computadoras.jpg',
      '/images/curso-notebooks.jpg',
      '/images/curso-glass.jpg',
      '/images/curso-neon.jpg',
      '/images/curso-estampados.jpg',
    ],
  },

  // ── Secciones activas ────────────────────────────────────
  sections: {
    hero:         true,
    stats:        true,
    about:        true,
    services:     true,   // cursos
    gallery:      true,   // flyers reales de cursos
    schedule:     false,
    pricing:      true,   // aranceles / cuotas
    testimonials: true,   // egresados
    team:         false,
    faq:          true,
    cta:          true,
    contact:      true,
  },

  // ── Contenido editable ───────────────────────────────────
  content: {

    about: {
      eyebrow: 'Quiénes somos',
      title: 'Formación técnica de taller, no de aula',
      body: 'En Recovery Parts aprendés con equipos reales, herramientas profesionales y grupos reducidos. Cada capacitación está pensada para que termines insertándote laboralmente o emprendiendo por tu cuenta — del problema al equipo funcionando.',
      bullets: [
        'Clases 100% prácticas con equipos reales',
        'Grupos reducidos y herramientas profesionales',
        'Evaluación y certificado final + soporte permanente de egresados',
      ],
    },

    cta: {
      title: 'Convertí tu oficio en tu próximo trabajo',
      subtitle: 'Cupos limitados por grupo. Escribinos por WhatsApp y reservá tu lugar en la próxima camada.',
    },

    // Cursos (sección "Servicios")
    services: [
      {
        icon: 'Smartphone',
        title: 'Reparación de iPhone',
        description: 'Microsoldadura, cambio de módulos y diagnóstico. 12 clases, una vez por semana.',
        price: '$25.000 + 3 cuotas de $65.000',
      },
      {
        icon: 'Smartphone',
        title: 'Reparación de Android',
        description: 'Hardware y software de celulares Android, de la falla al equipo funcionando.',
        price: '$25.000 + 3 cuotas de $65.000',
      },
      {
        icon: 'Cpu',
        title: 'Reparación de PC',
        description: 'Armado, mantenimiento y reparación de computadoras de escritorio. 16 clases.',
        price: '$25.000 + 3 cuotas de $65.000',
      },
      {
        icon: 'Laptop',
        title: 'Reparación de Notebooks',
        description: 'Reparación a nivel placa y componentes de notebooks. 12 clases.',
        price: '$25.000 + 3 cuotas de $65.000',
      },
      {
        icon: 'MonitorSmartphone',
        title: 'Cambio de Glass',
        description: 'Cambio de vidrio en pantallas Android y Apple. 2 clases intensivas.',
        price: '$25.000 + 3 cuotas de $65.000',
      },
      {
        icon: 'Tv',
        title: 'Reparación de TV',
        description: 'Diagnóstico y reparación de televisores LED y Smart TV.',
        price: '$25.000 + 3 cuotas de $65.000',
      },
      {
        icon: 'Lightbulb',
        title: 'Carteles Neón LED',
        description: 'Diseño y armado de carteles y letras corpóreas de neón LED.',
        price: '$25.000 + 3 cuotas de $65.000',
      },
      {
        icon: 'Printer',
        title: 'Estampado',
        description: 'Sublimación y estampado de remeras, gorras y tazas para emprender.',
        price: '$25.000 + 3 cuotas de $65.000',
      },
    ],

    testimonials: [
      {
        name: 'Lucas D.',
        role: 'Egresado — Reparación de Celulares',
        text: 'Entré sin saber nada y hoy tengo mi propio local de reparaciones. Las clases son 100% prácticas, con equipos reales.',
        rating: 5,
        avatar: '',
      },
      {
        name: 'Mariana S.',
        role: 'Egresada — Estampado',
        text: 'Aprendí sublimación y armé mi emprendimiento de remeras y tazas. El soporte de los profes después del curso es lo mejor.',
        rating: 5,
        avatar: '',
      },
      {
        name: 'Diego R.',
        role: 'Egresado — Reparación de PC',
        text: 'Grupos reducidos, herramientas profesionales y profes que te bancan. Conseguí trabajo en un service al mes de terminar.',
        rating: 5,
        avatar: '',
      },
    ],

    faq: [
      {
        question: '¿Necesito conocimientos previos?',
        answer: 'No. Las capacitaciones arrancan desde cero y son 100% prácticas, pensadas para que puedas insertarte laboralmente o emprender por tu cuenta.',
      },
      {
        question: '¿Cómo son los pagos?',
        answer: 'Inscripción de $25.000 y 3 cuotas fijas de $65.000 sin interés, igual en todos los cursos. Aceptamos efectivo (15% off), transferencia, tarjetas y GoCuotas.',
      },
      {
        question: '¿Los cupos son limitados?',
        answer: 'Sí. Trabajamos con grupos reducidos para garantizar atención personalizada y uso de herramientas reales. Los cupos se cierran cada mes.',
      },
      {
        question: '¿Entregan certificado?',
        answer: 'Sí. Al finalizar rendís una evaluación final y, al aprobarla, recibís tu certificado y pasás a formar parte de nuestra comunidad de egresados, con soporte técnico permanente.',
      },
      {
        question: '¿Dónde se cursa?',
        answer: 'Las clases son presenciales en nuestro taller de La Rioja 345, X5022 Córdoba, equipado con herramientas profesionales actualizadas.',
      },
    ],

    pricing: [
      {
        name: 'Reparación de Celulares',
        price: '$25.000',
        description: 'Inscripción + 3 cuotas de $65.000 sin interés',
        features: ['12 clases · 2 hs c/u', 'iPhone y Android', 'Microsoldadura y módulos', 'Herramientas del taller', 'Certificado final'],
        highlighted: false,
      },
      {
        name: 'Reparación de Computadoras',
        price: '$25.000',
        description: 'Inscripción + 3 cuotas de $65.000 sin interés',
        features: ['16 clases · 2 hs c/u', 'PC y Notebooks', 'Reparación a nivel placa', 'Grupos reducidos', 'Certificado + soporte'],
        highlighted: true,
      },
      {
        name: 'Oficios Creativos',
        price: '$25.000',
        description: 'Inscripción + 3 cuotas de $65.000 sin interés',
        features: ['Neón LED y letras corpóreas', 'Estampado y sublimación', 'Proyectos reales en clase', 'Pensado para emprender', 'Certificado final'],
        highlighted: false,
      },
    ],

    stats: [
      { value: '+500', label: 'Egresados' },
      { value: '8',    label: 'Capacitaciones' },
      { value: '100%', label: 'Práctico' },
      { value: '4.9',  label: 'Estrellas en Google' },
    ],

    team: [
      {
        name: 'Maxi Escaroni',
        role: 'Instructor — Carteles Neón LED',
        photo: '',
        instagram: '@recoveryparts',
      },
    ],

  },
}

export type DemoConfig = typeof demoConfig
