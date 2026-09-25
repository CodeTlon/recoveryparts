import { Clock, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00']
const TAKEN = [0, 2, 5]  // índices de slots "ocupados" en la demo

export default function Schedule() {
  const { business } = demoConfig
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <section id="schedule" className="section-pad" style={{ backgroundColor: 'var(--demo-surface)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="eyebrow">Agendá online</p>
          <h2 className="section-title">Reservá tu turno</h2>
          <p className="section-subtitle mt-4">
            Elegí el día y horario que mejor te quede.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Calendario */}
          <div className="card p-6" style={{ backgroundColor: 'var(--demo-surface-alt)' }}>
            <div className="flex items-center justify-between mb-6">
              <button className="p-2 opacity-50 cursor-default" style={{ backgroundColor: 'var(--demo-surface)', borderRadius: 'var(--demo-radius)', color: 'var(--demo-text)' }} disabled>
                <ChevronLeft size={18} />
              </button>
              <h3 className="font-bold" style={{ color: 'var(--demo-heading)' }}>
                {MONTHS[month]} {year}
              </h3>
              <button className="p-2 opacity-50 cursor-default" style={{ backgroundColor: 'var(--demo-surface)', borderRadius: 'var(--demo-radius)', color: 'var(--demo-text)' }} disabled>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--demo-muted)' }}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, i) => {
                const isToday = day === today
                const isFuture = day && day > today
                return (
                  <div
                    key={i}
                    className={`aspect-square flex items-center justify-center text-sm ${isToday ? 'font-bold' : ''} ${isFuture ? 'cursor-default hover:opacity-80' : 'cursor-default'}`}
                    style={{
                      borderRadius: 'var(--demo-radius)',
                      backgroundColor: isToday ? 'var(--demo-accent)' : isFuture ? 'var(--demo-surface)' : 'transparent',
                      color: isToday ? 'var(--demo-on-accent)' : 'var(--demo-text)',
                      opacity: !day || (!isToday && !isFuture) ? 0.3 : 1,
                    }}
                  >
                    {day}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Slots de horario */}
          <div className="card p-6" style={{ backgroundColor: 'var(--demo-surface-alt)' }}>
            <div className="flex items-center gap-2 mb-6">
              <Clock size={18} style={{ color: 'var(--demo-accent)' }} />
              <h3 className="font-bold" style={{ color: 'var(--demo-heading)' }}>
                Horarios disponibles — hoy
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {SLOTS.map((slot, i) => {
                const isTaken = TAKEN.includes(i)
                return (
                  <div
                    key={slot}
                    className="py-3 text-center text-sm font-medium cursor-default"
                    style={{
                      borderRadius: 'var(--demo-radius)',
                      backgroundColor: isTaken ? 'var(--demo-surface)' : 'var(--demo-accent)',
                      color: isTaken ? 'var(--demo-muted)' : 'var(--demo-on-accent)',
                      opacity: isTaken ? 0.5 : 1,
                      textDecoration: isTaken ? 'line-through' : 'none',
                    }}
                  >
                    {slot}
                  </div>
                )
              })}
            </div>

            <div className="mt-8 p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--demo-surface)', borderRadius: 'var(--demo-radius)' }}>
              <CalendarCheck size={20} style={{ color: 'var(--demo-accent)', flexShrink: 0 }} className="mt-0.5" />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--demo-heading)' }}>
                  Para confirmar tu turno
                </p>
                <p className="text-xs" style={{ color: 'var(--demo-muted)' }}>
                  Contactanos por WhatsApp al {business.phone} y te confirmamos en minutos.
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/${business.whatsapp}?text=Hola! Quiero reservar un turno.`}
              className="mt-4 w-full block text-center py-3 font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--demo-accent)', color: 'var(--demo-on-accent)', borderRadius: 'var(--demo-radius)' }}
            >
              Reservar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
