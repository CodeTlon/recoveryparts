// Textos editables de las páginas públicas (Campus › Sitio web). Se guardan en `site_settings` con la clave `textos`,
// agrupados por página. Lo que el admin deja vacío usa el valor de acá: el sitio nunca queda con un título en blanco y,
// sin base, se ve igual que antes de que estos textos fueran editables.
export const TEXTOS_BASE = {
  inicio: {
    proximos_titulo: 'Próximos inicios',
    proximos_bajada: 'Las próximas ediciones con fecha confirmada. Cada curso tiene cupo limitado.',
    destacados_titulo: 'Capacitaciones destacadas',
    egresados_titulo: 'Construyendo profesionales',
    egresados_bajada: 'Los grupos que terminaron cada curso y taller.',
    testimonios_titulo: 'Lo que dicen nuestros alumnos',
    faq_titulo: 'Preguntas frecuentes',
  },
  cursos: {
    titulo: 'Cursos y talleres',
    bajada: 'Formación 100% presencial en Córdoba. Cursos de varias semanas y talleres cortos: una jornada, días seguidos o 1 a 2 semanas.',
    descripcion: 'Cursos y talleres presenciales en Córdoba: reparación y tecnología, y diseño. Fechas, horarios y cupos.',
  },
  aulas: { titulo: 'Aulas' },
  faq: {
    titulo: 'Preguntas frecuentes',
    bajada: 'Todo lo que suelen preguntarnos antes de empezar.',
    descripcion: 'Respuestas a las dudas más comunes sobre cursos, talleres y el campus.',
  },
  contacto: {
    titulo: 'Contacto',
    bajada: 'Escribinos con tu consulta o pasá por la academia. Te respondemos por mail.',
    mapa_titulo: 'Dónde estamos',
    form_titulo: 'Escribinos',
    descripcion: 'Escribinos o visitanos: dirección, horarios y formulario de consulta.',
  },
  pie: { descripcion: 'Academia de cursos y talleres presenciales de reparación, tecnología y diseño en Córdoba.' },
  seo: {
    titulo: 'Recovery Parts — Academia de cursos técnicos',
    descripcion: 'Cursos y talleres presenciales de diseño y tecnología en Córdoba.',
  },
}

export type Textos = typeof TEXTOS_BASE
export type TextosGuardados = { [P in keyof Textos]?: { [K in keyof Textos[P]]?: string } }

// Mezcla lo guardado con los valores por defecto, campo por campo (un texto vacío cuenta como «sin cargar»).
export function conTextos(guardados: TextosGuardados | undefined): Textos {
  const r = structuredClone(TEXTOS_BASE) as Record<string, Record<string, string>>
  for (const [pagina, campos] of Object.entries(guardados ?? {}))
    for (const [k, v] of Object.entries(campos ?? {}))
      if (r[pagina] && k in r[pagina] && typeof v === 'string' && v.trim()) r[pagina][k] = v.trim()
  return r as Textos
}
