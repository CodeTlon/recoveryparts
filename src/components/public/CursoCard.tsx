import Link from 'next/link'
import Image from 'next/image'
import SpotlightCard from '@/components/ui/SpotlightCard'
import { Clock, Flame, CalendarDays, Wrench, Search } from 'lucide-react'
import { AREA_LABEL, DIAS, TIPO_LABEL, formatPrecio, precioFinal, type CursoPublico, type Horario } from '@/lib/types'

export function horarioTexto(hs: Horario[]) {
  if (!hs.length) return null
  return hs.map((h) => `${DIAS[h.dia_semana].slice(0, 3)} ${h.hora_inicio.slice(0, 5)}–${h.hora_fin.slice(0, 5)}`).join(' · ')
}

export function Cupos({ n }: { n: number }) {
  if (n <= 0) return <span className="badge bg-surface-container-high text-on-surface-variant">Sin cupos</span>
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${n <= 5 ? 'text-accent' : 'text-on-surface-variant'}`}>
      <Flame size={14} /> {n <= 5 ? `¡Quedan ${n} lugar${n === 1 ? '' : 'es'}!` : `${n} cupos disponibles`}
    </span>
  )
}

export function Precio({ c, size = 'text-sm' }: { c: CursoPublico; size?: string }) {
  const fin = precioFinal(c)
  return (
    <span className={`${size} font-bold text-on-surface`}>
      {c.descuento_pct ? <s className="mr-2 text-xs font-normal text-on-surface-variant">{formatPrecio(c.precio)}</s> : null}
      {formatPrecio(fin)}
    </span>
  )
}

export default function CursoCard({ c, horarios }: { c: CursoPublico; horarios: Horario[] }) {
  const h = horarioTexto(horarios)
  return (
    <SpotlightCard className="h-full">
    <Link href={`/cursos/${c.slug}`} className="group flex h-full flex-col">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-outline-variant bg-surface-container">
        {c.imagen_url
          ? <Image src={c.imagen_url} alt={c.nombre} fill sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="grid-bg flex h-full items-center justify-center text-outline-variant"><Wrench size={48} aria-hidden /></div>}
        {c.tipo === 'taller' && <span className="badge absolute left-3 top-3 bg-accent text-surface">{TIPO_LABEL.taller}</span>}
        <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-surface/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
          <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-white/80 text-white"><Search size={24} /></span>
        </span>
      </div>
      <div className="flex flex-grow flex-col p-5">
        <span className="mb-1 text-xs font-bold uppercase tracking-widest text-accent">{AREA_LABEL[c.area]}</span>
        <h3 className="mb-3 text-lg font-semibold text-on-surface">{c.nombre}</h3>
        <div className="mb-1 flex items-center gap-2 text-sm text-on-surface-variant">
          <Clock size={15} /> {c.duracion_semanas ? `${c.duracion_semanas} semanas` : 'Duración a confirmar'}
        </div>
        {h && <div className="mb-3 flex items-center gap-2 text-sm text-on-surface-variant"><CalendarDays size={15} /> {h}</div>}
        <div className="mt-auto border-t border-outline-variant pt-4">
          <div className="flex items-end justify-between gap-3">
            <Precio c={c} size="text-2xl" />
            <span className="rounded border-2 border-accent px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-accent transition-colors group-hover:bg-accent group-hover:text-surface">+ info</span>
          </div>
          <div className="mt-2"><Cupos n={c.cupos_disponibles} /></div>
        </div>
      </div>
    </Link>
    </SpotlightCard>
  )
}
