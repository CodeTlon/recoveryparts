'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { DIAS } from '@/lib/types'

// Editores por filas para lo que antes era un textarea con formato "a | b | c".
// Cada uno serializa al MISMO texto que ya entienden las server actions (guardarHorarios,
// guardarModulos, guardarKit, guardarClases), en un <textarea hidden> con el `name` del campo.

const limpiar = (s: string) => s.replace(/[|\n\r]/g, ' ').trim()

function Serial({ name, value }: { name: string; value: string }) {
  return <textarea name={name} value={value} readOnly hidden aria-hidden tabIndex={-1} />
}

// Bloquea el envío del <form> mientras haya un error (validación nativa con el mensaje del editor):
// así nunca se guarda una lista a medias ni se vacía una tabla por un campo mal cargado.
function Guard({ error }: { error: string }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.setCustomValidity(error) }, [error])
  return <input ref={ref} value="" onChange={() => {}} className="sr-only" tabIndex={-1} aria-hidden />
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="btn-ghost !px-3 !py-2"><Plus size={14} aria-hidden /> {children}</button>
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded border border-outline-variant text-on-surface-variant hover:border-red-400 hover:text-red-300">
      <Trash2 size={15} aria-hidden />
    </button>
  )
}

// ── Horarios: día + hora de inicio y fin ─────────────────────────────────────────────────────
type H = { dia: number; ini: string; fin: string }

export function HorariosEditor({ name, inicial, onChange }: { name: string; inicial: H[]; onChange?: (dias: number[]) => void }) {
  const [rows, setRows] = useState<H[]>(inicial)
  const set = (next: H[]) => { setRows(next); onChange?.([...new Set(next.map((r) => r.dia))]) }
  const upd = (i: number, p: Partial<H>) => set(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const errH = rows.some((r) => r.ini && r.fin && r.fin <= r.ini) ? 'La hora de fin tiene que ser posterior a la de inicio.'
    : new Set(rows.map((r) => `${r.dia} ${r.ini}`)).size < rows.length ? 'Hay dos horarios iguales el mismo día.' : ''
  return (
    <div className="space-y-3">
      <Serial name={name} value={rows.map((r) => `${r.dia} ${r.ini}-${r.fin}`).join('\n')} />
      <Guard error={errH} />
      {!rows.length && <p className="text-sm text-on-surface-variant">Todavía no hay días cargados.</p>}
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[8rem] flex-1"><label className="label">Día</label>
            <select className="input" value={r.dia} onChange={(e) => upd(i, { dia: Number(e.target.value) })}>{DIAS.map((d, n) => <option key={d} value={n}>{d}</option>)}</select></div>
          <div><label className="label">Desde</label><input type="time" required className="input" value={r.ini} onChange={(e) => upd(i, { ini: e.target.value })} /></div>
          <div><label className="label">Hasta</label><input type="time" required className="input" value={r.fin} onChange={(e) => upd(i, { fin: e.target.value })} /></div>
          <RemoveButton onClick={() => set(rows.filter((_, j) => j !== i))} label="Quitar horario" />
        </div>
      ))}
      {errH && <p role="alert" className="text-sm text-red-400">{errH}</p>}
      <AddButton onClick={() => set([...rows, { dia: 1, ini: '18:00', fin: '20:00' }])}>Agregar día</AddButton>
    </div>
  )
}

// ── Plan de estudios: módulos con sus temas ──────────────────────────────────────────────────
type M = { titulo: string; temas: string }

export function ModulosEditor({ name, inicial }: { name: string; inicial: M[] }) {
  const [rows, setRows] = useState<M[]>(inicial)
  const upd = (i: number, p: Partial<M>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const errM = rows.some((r) => !limpiar(r.titulo)) ? 'Completá el título de cada módulo o quitá el que sobra.' : ''
  const txt = rows.filter((r) => limpiar(r.titulo)).map((r) => `# ${limpiar(r.titulo)}\n${r.temas.split('\n').map(limpiar).filter(Boolean).join('\n')}`).join('\n')
  return (
    <div className="space-y-4">
      <Serial name={name} value={txt} />
      <Guard error={errM} />
      {errM && <p role="alert" className="text-sm text-red-400">{errM}</p>}
      {!rows.length && <p className="text-sm text-on-surface-variant">Todavía no hay módulos.</p>}
      {rows.map((r, i) => (
        <div key={i} className="rounded border border-outline-variant p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1"><label className="label">Módulo {i + 1}</label>
              <input className="input" placeholder="Ej: Diagnóstico de fallas" value={r.titulo} onChange={(e) => upd(i, { titulo: e.target.value })} /></div>
            <RemoveButton onClick={() => setRows(rows.filter((_, j) => j !== i))} label="Quitar módulo" />
          </div>
          <label className="label mt-3">Temas (uno por línea)</label>
          <textarea rows={4} className="input" placeholder={'Uso del multímetro\nLectura de esquemas'} value={r.temas} onChange={(e) => upd(i, { temas: e.target.value })} />
        </div>
      ))}
      <AddButton onClick={() => setRows([...rows, { titulo: '', temas: '' }])}>Agregar módulo</AddButton>
    </div>
  )
}

// ── Kit: herramientas / materiales ───────────────────────────────────────────────────────────
type K = { nombre: string; descripcion: string; precio: string; link: string }

export function KitEditor({ name, inicial }: { name: string; inicial: K[] }) {
  const [rows, setRows] = useState<K[]>(inicial)
  const upd = (i: number, p: Partial<K>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const errK = rows.some((r) => !limpiar(r.nombre)) ? 'Completá el nombre de cada ítem o quitá el que sobra.' : rows.some((r) => r.precio !== '' && Number(r.precio) < 0) ? 'El precio no puede ser negativo.' : ''
  const txt = rows.filter((r) => limpiar(r.nombre)).map((r) => [r.nombre, r.descripcion, r.precio, r.link].map(limpiar).join(' | ')).join('\n')
  return (
    <div className="space-y-4">
      <Serial name={name} value={txt} />
      <Guard error={errK} />
      {errK && <p role="alert" className="text-sm text-red-400">{errK}</p>}
      {!rows.length && <p className="text-sm text-on-surface-variant">Todavía no hay ítems.</p>}
      {rows.map((r, i) => (
        <div key={i} className="rounded border border-outline-variant p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Ítem</label><input className="input" placeholder="Ej: Multímetro" value={r.nombre} onChange={(e) => upd(i, { nombre: e.target.value })} /></div>
            <div><label className="label">Precio de referencia (ARS)</label><input type="number" min={0} className="input" placeholder="Ej: 15000" value={r.precio} onChange={(e) => upd(i, { precio: e.target.value })} /></div>
            <div><label className="label">Descripción</label><input className="input" placeholder="Ej: Para medir tensión y continuidad" value={r.descripcion} onChange={(e) => upd(i, { descripcion: e.target.value })} /></div>
            <div><label className="label">Link (opcional)</label><input type="url" className="input" placeholder="https://…" value={r.link} onChange={(e) => upd(i, { link: e.target.value })} /></div>
          </div>
          <div className="mt-3 flex justify-end"><RemoveButton onClick={() => setRows(rows.filter((_, j) => j !== i))} label="Quitar ítem" /></div>
        </div>
      ))}
      <AddButton onClick={() => setRows([...rows, { nombre: '', descripcion: '', precio: '', link: '' }])}>Agregar ítem</AddButton>
    </div>
  )
}

// ── Calendario de clases ─────────────────────────────────────────────────────────────────────
type C = { fecha: string; titulo: string; estado: string }

// Fechas desde `inicio` que caen en los días de la semana dados (0=Domingo … 6=Sábado).
function generarFechas(inicio: string, dias: number[], cantidad: number): string[] {
  if (!inicio || !dias.length) return []
  const d = new Date(`${inicio}T12:00:00Z`) // mediodía UTC: sin corrimientos de huso
  const out: string[] = []
  for (let n = 0; out.length < cantidad && n < 800; n++, d.setUTCDate(d.getUTCDate() + 1)) {
    if (dias.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export function ClasesEditor({ name, inicial, inicio, dias, avisar }: { name: string; inicial: C[]; inicio?: string | null; dias?: number[]; avisar?: React.ReactNode }) {
  const [rows, setRows] = useState<C[]>(inicial)
  const [cant, setCant] = useState(String(Math.max(inicial.length, 12)))
  const id = useId()
  const upd = (i: number, p: Partial<C>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const txt = rows.filter((r) => r.fecha && limpiar(r.titulo)).map((r, i) => `${i + 1} | ${r.fecha} | ${limpiar(r.titulo)} | ${r.estado}`).join('\n')
  const fechas = rows.map((r) => r.fecha)
  const errC = rows.some((r) => !r.fecha || !limpiar(r.titulo)) ? 'Cada clase necesita fecha y título.'
    : new Set(fechas).size < fechas.length ? 'Hay dos clases en la misma fecha.'
    : fechas.some((f, i) => i > 0 && f < fechas[i - 1]) ? 'Las clases tienen que estar en orden cronológico.' : ''
  const antesDeInicio = !!inicio && !!fechas[0] && fechas[0] < inicio
  const puedeGenerar = !!inicio && !!dias?.length
  const generar = () => {
    const f = generarFechas(inicio!, dias!, Math.min(Math.max(parseInt(cant) || 0, 1), 60))
    setRows(f.map((fecha, i) => ({ fecha, titulo: rows[i]?.titulo || `Clase ${i + 1}`, estado: rows[i]?.estado ?? 'programada' })))
  }
  return (
    <div className="space-y-4">
      <Serial name={name} value={txt} />
      <Guard error={errC} />
      <div className="flex flex-wrap items-end gap-2 rounded border border-dashed border-outline-variant p-3">
        <div><label htmlFor={id} className="label">Cantidad de clases</label>
          <input id={id} type="number" min={1} max={60} className="input !w-28" value={cant} onChange={(e) => setCant(e.target.value)} /></div>
        <button type="button" disabled={!puedeGenerar} onClick={generar} className="btn-ghost !px-3 !py-2 disabled:opacity-50"><Wand2 size={14} aria-hidden /> Generar fechas</button>
        <p className="min-w-[12rem] flex-1 text-xs text-on-surface-variant">
          {puedeGenerar ? 'Arma el calendario desde la fecha de inicio, usando los días de cursada. Conserva los títulos ya cargados.' : 'Para generar fechas, cargá antes la fecha de inicio (Datos) y los horarios.'}
        </p>
      </div>
      {!rows.length && <p className="text-sm text-on-surface-variant">Todavía no hay clases.</p>}
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <span className="w-8 shrink-0 pb-2 text-center text-sm font-semibold text-on-surface-variant" aria-label={`Clase ${i + 1}`}>{i + 1}</span>
            <div><label className="sr-only">Fecha clase {i + 1}</label><input type="date" required className="input" value={r.fecha} onChange={(e) => upd(i, { fecha: e.target.value })} /></div>
            <div className="min-w-[10rem] flex-1"><label className="sr-only">Título clase {i + 1}</label><input className="input" placeholder="Título de la clase" required value={r.titulo} onChange={(e) => upd(i, { titulo: e.target.value })} /></div>
            <div><label className="sr-only">Estado clase {i + 1}</label>
              <select className="input" value={r.estado} onChange={(e) => upd(i, { estado: e.target.value })}>
                <option value="programada">Programada</option><option value="suspendida">Suspendida</option><option value="reprogramada">Reprogramada</option>
              </select></div>
            <RemoveButton onClick={() => setRows(rows.filter((_, j) => j !== i))} label="Quitar clase" />
          </div>
        ))}
      </div>
      {errC && <p role="alert" className="text-sm text-red-400">{errC}</p>}
      {antesDeInicio && <p className="text-sm text-secondary">Ojo: la primera clase es anterior a la fecha de inicio del curso.</p>}
      <AddButton onClick={() => setRows([...rows, { fecha: '', titulo: `Clase ${rows.length + 1}`, estado: 'programada' }])}>Agregar clase</AddButton>
      {avisar}
    </div>
  )
}
