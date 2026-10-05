export type Rol = 'admin' | 'profesor' | 'alumno'
export type Area = 'diseno' | 'tecnico'
export type TipoCurso = 'curso' | 'taller'

// Etiquetas públicas. La academia no presta servicio técnico: "tecnico" es el área de
// cursos de reparación y tecnología.
export const AREA_LABEL: Record<Area, string> = {
  diseno: 'Creación y Diseño',
  tecnico: 'Reparación y Tecnología',
}
export const TIPO_LABEL: Record<TipoCurso, string> = { curso: 'Curso', taller: 'Taller' }
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Un curso del catálogo con los datos de su PRÓXIMA edición abierta (null = «Próximamente nuevas fechas»).
export interface CursoPublico {
  id: string; slug: string; nombre: string; area: Area; tipo: TipoCurso; nivel: string | null
  descripcion: string | null; requisitos: string | null; imagen_url: string | null; video_url: string | null
  duracion_semanas: number | null
  precio: number | null; descuento_pct: number | null; precio_actualizado_en: string | null
  destacado: boolean
  edicion_id: string | null; fecha_inicio: string | null; cupo: number | null; cupos_disponibles: number | null; aula: string | null
  profesor_nombre: string | null; profesor_foto: string | null
  profesor_experiencia: string | null; profesor_certificaciones: string | null
  ediciones_abiertas: number
}
// Edición abierta (empieza hoy o después) de un curso activo.
export interface EdicionPublica {
  id: string; curso_id: string; fecha_inicio: string; fecha_fin: string | null; cupo: number; cupos_disponibles: number
  aula: string | null; profesor_nombre: string | null
}
export interface Horario { edicion_id: string; curso_id: string; dia_semana: number; hora_inicio: string; hora_fin: string }

/** 14/09/2026 → "14 de septiembre" (+ año si no es el actual). */
export const fechaCorta = (f: string) => {
  const d = new Date(`${f}T12:00:00Z`)
  const txt = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  return d.getUTCFullYear() === new Date().getUTCFullYear() ? txt : `${txt} de ${d.getUTCFullYear()}`
}

export const formatPrecio = (n: number | null) =>
  n == null ? 'Consultar' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
export const precioFinal = (c: Pick<CursoPublico, 'precio' | 'descuento_pct'>) =>
  c.precio == null ? null : c.precio * (1 - (c.descuento_pct ?? 0) / 100)
