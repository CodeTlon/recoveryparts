import Link from 'next/link'
import Image from 'next/image'
import SpotlightCard from '@/components/ui/SpotlightCard'
import { Clock, Flame, CalendarDays, Wrench } from 'lucide-react'
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
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="badge border border-outline-variant bg-surface/90 text-accent backdrop-blur">{AREA_LABEL[c.area]}</span>
          {c.tipo === 'taller' && <span className="badge bg-accent text-white">{TIPO_LABEL.taller}</span>}
        </div>
      </div>
      <div className="flex flex-grow flex-col p-5">
        <h3 className="mb-2 text-lg font-semibold text-on-surface">{c.nombre}</h3>
        <div className="mb-1 flex items-center gap-2 text-sm text-on-surface-variant">
          <Clock size={15} /> {c.duracion_semanas ? `${c.duracion_semanas} semanas` : 'Duración a confirmar'}
        </div>
        {h && <div className="mb-3 flex items-center gap-2 text-sm text-on-surface-variant"><CalendarDays size={15} /> {h}</div>}
        <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-4">
          <Precio c={c} />
          <Cupos n={c.cupos_disponibles} />
        </div>
      </div>
    </Link>
    </SpotlightCard>
  )
}
