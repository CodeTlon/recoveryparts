// El servidor corre en UTC; la academia está en Córdoba. Desde las 21:00 (UTC-3) `new Date()` ya es "mañana".
const TZ = 'America/Argentina/Cordoba'

/** Fecha de hoy en Córdoba como AAAA-MM-DD (misma que devuelve hoy_ar() en la base). */
export const hoyAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())

/** "1 semana" / "12 semanas" (los talleres cortos duran 1 o 2). */
export const duracionTexto = (n: number) => `${n} ${n === 1 ? 'semana' : 'semanas'}`

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
/** Nombre corto de una edición por su fecha de inicio: "sep 2026" (sin fecha: "sin fecha"). */
export const etiquetaEdicion = (inicio: string | null | undefined) =>
  inicio && /^\d{4}-\d{2}/.test(inicio) ? `${MESES[Number(inicio.slice(5, 7)) - 1]} ${inicio.slice(0, 4)}` : 'sin fecha'

export type MomentoEdicion = 'baja' | 'proxima' | 'en_curso' | 'terminada'
/**
 * Estado temporal de una edición (RF-04). Misma regla que `fin_edicion()` / `edicion_vigente()` en la base:
 * el fin es la última fecha del calendario (o el inicio si no hay clases); terminada si el fin ya pasó.
 */
export function momentoEdicion(e: { activo: boolean; fecha_inicio: string | null; fechas: string[] }, hoy: string): { momento: MomentoEdicion; fin: string } {
  const fin = e.fechas.reduce((m, f) => (f > m ? f : m), e.fecha_inicio ?? '')
  if (!e.activo) return { momento: 'baja', fin }
  if (e.fecha_inicio && e.fecha_inicio > hoy) return { momento: 'proxima', fin }
  if (fin && fin < hoy) return { momento: 'terminada', fin }
  return { momento: 'en_curso', fin }
}
