import { createClient } from '@/lib/supabase/server'

export type SitioConfigData = {
  hero: { titulo: string; subtitulo: string; imagen_url: string }
  areas: { tecnico: { titulo: string; descripcion: string }; diseno: { titulo: string; descripcion: string } }
  stats: { aulas: number; profesores: number; egresados: number }
  contacto: { whatsapp: string; direccion: string; instagram: string | null; email: string }
}

// Fallback si por algún motivo la fila singleton no existe (no debería pasar,
// la migración 0005 la siembra) — evita que la Home explote con undefined.
const DEFAULT: SitioConfigData = {
  hero: { titulo: 'Recovery Parts', subtitulo: 'Formación técnica en Córdoba.', imagen_url: '/images/hero.jpg' },
  areas: {
    tecnico: { titulo: 'Servicio Técnico y Tecnológico', descripcion: '' },
    diseno: { titulo: 'Creación y Diseño', descripcion: '' },
  },
  stats: { aulas: 0, profesores: 0, egresados: 0 },
  contacto: { whatsapp: '', direccion: '', instagram: null, email: '' },
}

export async function getSitioConfig(): Promise<SitioConfigData> {
  const supabase = await createClient()
  const { data } = await supabase.from('sitio_config').select('*').eq('id', 1).maybeSingle()
  if (!data) return DEFAULT
  return {
    hero: { ...DEFAULT.hero, ...(data.hero ?? {}) },
    areas: {
      tecnico: { ...DEFAULT.areas.tecnico, ...(data.areas?.tecnico ?? {}) },
      diseno: { ...DEFAULT.areas.diseno, ...(data.areas?.diseno ?? {}) },
    },
    stats: { ...DEFAULT.stats, ...(data.stats ?? {}) },
    contacto: { ...DEFAULT.contacto, ...(data.contacto ?? {}) },
  }
}
