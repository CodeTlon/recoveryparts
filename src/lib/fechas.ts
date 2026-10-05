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
