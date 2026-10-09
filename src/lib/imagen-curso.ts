// Foto por defecto de un curso. Se usa cuando el curso no tiene imagen cargada o conserva
// alguno de los afiches viejos del sitio (`/images/curso-*.jpg`). Una imagen subida desde el
// campus (Storage) o cualquier otra URL se respeta tal cual. Fotos en public/images/cursos/.
const POR_TEMA: [RegExp, string][] = [
  [/micro\s?sold/, 'microsoldadura'],
  [/sold|smd/, 'soldadura'],
  [/mult[ií]metro/, 'multimetro'],
  [/3d/, 'impresion-3d'],
  [/ne[oó]n|led|cartel/, 'neon'],
  [/se[ñn]al[eé]tica/, 'senaletica'],
  [/consola/, 'consolas'],
  [/televisor|\btv\b/, 'televisores'],
  [/notebook|laptop/, 'notebooks'],
  [/\bpcs?\b|computadora|armado/, 'pcs'],
  [/glass|iphone|apple/, 'smartphone'],
  [/celular|bater[ií]a|android|m[oó]vil/, 'celulares'],
  [/electr[oó]nica/, 'electronica'],
  [/fotograf/, 'fotografia'],
  [/dise[ñn]o gr[aá]fico|gr[aá]fic/, 'diseno-grafico'],
]

export function imagenCurso(c: { nombre: string; imagen_url?: string | null }): string | null {
  const actual = c.imagen_url?.trim()
  if (actual && !actual.startsWith('/images/curso-')) return actual
  const nombre = c.nombre.toLowerCase()
  const tema = POR_TEMA.find(([re]) => re.test(nombre))
  return tema ? `/images/cursos/${tema[1]}.jpg` : actual || null
}
