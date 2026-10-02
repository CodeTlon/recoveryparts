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

export interface CursoPublico {
  id: string; slug: string; nombre: string; area: Area; tipo: TipoCurso; nivel: string | null
  descripcion: string | null; requisitos: string | null; imagen_url: string | null; video_url: string | null
  duracion_semanas: number | null; cupo: number; cupos_disponibles: number
  precio: number | null; descuento_pct: number | null; precio_actualizado_en: string | null
  fecha_inicio: string | null; destacado: boolean; aula: string | null
  profesor_nombre: string | null; profesor_foto: string | null
  profesor_experiencia: string | null; profesor_certificaciones: string | null
}
export interface Horario { curso_id: string; dia_semana: number; hora_inicio: string; hora_fin: string }

export const formatPrecio = (n: number | null) =>
  n == null ? 'Consultar' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
export const precioFinal = (c: Pick<CursoPublico, 'precio' | 'descuento_pct'>) =>
  c.precio == null ? null : c.precio * (1 - (c.descuento_pct ?? 0) / 100)
