import { ViewTransition } from 'react'
import { duracionTexto } from '@/lib/fechas'
import { fechaCorta } from '@/lib/types'
import Link from 'next/link'
import Image from 'next/image'
import { imagenCurso } from '@/lib/imagen-curso'
import Inclinable from '@/components/ui/Inclinable'
import { Clock, Flame, CalendarDays, Wrench, BookOpen, ArrowUpRight } from 'lucide-react'
import { AREA_LABEL, DIAS, TIPO_LABEL, formatPrecio, precioFinal, type Area, type CursoPublico, type Horario } from '@/lib/types'

// Cada área lleva el color de una mitad del logo: Reparación y Tecnología, el circuito naranja; Diseño, el mundo azul.
export const AREA_COLOR: Record<Area, { texto: string; fondo: string; borde: string; bordeHover: string }> = {
  tecnico: { texto: 'text-accent', fondo: 'bg-accent', borde: 'border-accent', bordeHover: 'hover:border-accent' },
  diseno: { texto: 'text-signal-blue', fondo: 'bg-signal-blue', borde: 'border-signal-blue', bordeHover: 'hover:border-signal-blue' },
}

export function horarioTexto(hs: Horario[]) {
  if (!hs.length) return null
  return hs.map((h) => `${DIAS[h.dia_semana].slice(0, 3)} ${h.hora_inicio.slice(0, 5)}–${h.hora_fin.slice(0, 5)}`).join(' · ')
}

export function Cupos({ n }: { n: number }) {
  if (n <= 0) return <span className="badge bg-surface-container-high text-on-surface-variant">Sin cupos</span>
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${n <= 5 ? 'text-accent' : 'text-on-surface-variant'}`}>
      <Flame size={14} aria-hidden /> {n <= 5 ? `¡Quedan ${n} lugar${n === 1 ? '' : 'es'}!` : `${n} cupos disponibles`}
    </span>
  )
}

export function Precio({ c, size = 'text-sm' }: { c: CursoPublico; size?: string }) {
  const fin = precioFinal(c)
  return (
    <span className={`${size} font-bold tabular-nums text-on-surface`}>
      {c.descuento_pct ? <s className="mr-2 text-xs font-normal text-on-surface-variant">{formatPrecio(c.precio)}</s> : null}
      {formatPrecio(fin)}
    </span>
  )
}

// `modulos`: títulos del plan de estudios (opcional). Se muestran los primeros y un «+N más».
// `horarios`: los de la próxima edición del curso. Sin próxima edición: «Próximamente nuevas fechas».
// La foto lleva un ViewTransition con nombre: al abrir la ficha se transforma en la foto grande (si el navegador puede).
export default function CursoCard({ c, horarios, modulos = [] }: { c: CursoPublico; horarios: Horario[]; modulos?: string[] }) {
  const h = horarioTexto(horarios)
  const foto = imagenCurso(c)
  const otras = c.ediciones_abiertas - 1
  const color = AREA_COLOR[c.area]
  return (
    <Inclinable className="h-full">
      <Link href={`/cursos/${c.slug}`} className="group relative flex h-full flex-col overflow-hidden rounded-card border border-outline-variant bg-surface-container-low shadow-card transition-[border-color,box-shadow] duration-300 hover:border-outline hover:shadow-card-hover">
        <div className="relative aspect-4/3 overflow-hidden bg-surface-container">
          <ViewTransition name={`curso-foto-${c.slug}`} share="morph" default="none">
            <div className="inclinable-capa absolute inset-0">
              {foto
                ? <Image src={foto} alt={c.nombre} fill sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,400px" className="object-cover" />
                : <div className="flex h-full items-center justify-center text-outline-variant"><Wrench size={48} aria-hidden /></div>}
            </div>
          </ViewTransition>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-surface-container-low/90 to-transparent" />
          {c.tipo === 'taller' && <span className="badge absolute left-3 top-3 bg-surface-container-lowest/85 text-on-surface backdrop-blur-sm">{TIPO_LABEL.taller}</span>}
          <span aria-hidden className="absolute right-3 top-3 grid h-10 w-10 translate-y-1 place-items-center rounded-full bg-accent text-surface-container-lowest opacity-0 transition-[opacity,translate] duration-300 ease-(--ease-out) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
            <ArrowUpRight size={20} />
          </span>
        </div>
        <span aria-hidden className="inclinable-brillo pointer-events-none absolute inset-0" />

        <div className="flex grow flex-col p-5 md:p-6">
          <span className={`mb-2 inline-flex items-center gap-2 text-xs font-bold ${color.texto}`}>
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${color.fondo}`} /> {AREA_LABEL[c.area]}
          </span>
          <h3 className="display mb-4 text-xl leading-tight [font-stretch:108%]">{c.nombre}</h3>
          <ul className="mb-4 space-y-1.5 text-sm text-on-surface-variant">
            <li className="flex items-center gap-2"><Clock size={15} aria-hidden className="shrink-0" /> {c.duracion_semanas ? duracionTexto(c.duracion_semanas) : 'Duración a confirmar'}</li>
            {c.fecha_inicio
              ? <li className="flex items-center gap-2"><CalendarDays size={15} aria-hidden className="shrink-0" /> <span>Inicia el {fechaCorta(c.fecha_inicio)}{otras > 0 ? <span className="text-secondary"> · +{otras} fecha{otras === 1 ? '' : 's'} más</span> : null}</span></li>
              : <li className="flex items-center gap-2 font-semibold text-secondary"><CalendarDays size={15} aria-hidden className="shrink-0" /> Próximamente nuevas fechas</li>}
            {h && <li className="pl-[23px] tabular-nums">{h}</li>}
          </ul>
          {modulos.length > 0 && (
            <div className="mb-4">
              <p className="dato mb-1.5 flex items-center gap-1.5"><BookOpen size={13} aria-hidden /> {modulos.length} módulo{modulos.length === 1 ? '' : 's'}</p>
              <ul className="flex flex-wrap gap-1.5">
                {modulos.slice(0, 3).map((m) => <li key={m} className="rounded-full border border-outline-variant px-2.5 py-0.5 text-xs text-on-surface-variant">{m}</li>)}
                {modulos.length > 3 && <li className="rounded-full border border-outline-variant px-2.5 py-0.5 text-xs font-semibold text-secondary">+{modulos.length - 3} más</li>}
              </ul>
            </div>
          )}
          <div className="mt-auto flex items-end justify-between gap-3 border-t border-outline-variant/70 pt-4">
            <Precio c={c} size="text-2xl" />
            {c.cupos_disponibles != null && <Cupos n={c.cupos_disponibles} />}
          </div>
        </div>
      </Link>
    </Inclinable>
  )
}
