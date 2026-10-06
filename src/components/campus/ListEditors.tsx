'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, Wand2 } from 'lucide-react'
import { DIAS } from '@/lib/types'
import { MUNDO_PARTS_URL } from '@/lib/validar'

// Editores por filas para lo que antes era un textarea con formato "a | b | c".
// Cada uno serializa al MISMO texto que ya entienden las server actions (guardarHorarios,
// guardarKit, guardarEstructura, guardarClases), en un <textarea hidden> con el `name` del campo.

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

function RemoveButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={disabled || label} disabled={!!disabled}
      className="grid h-9 w-9 shrink-0 place-items-center rounded border border-outline-variant text-on-surface-variant hover:border-red-400 hover:text-red-300 disabled:pointer-events-none disabled:opacity-30">
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

// ── Kit: herramientas / materiales ───────────────────────────────────────────────────────────
// Cada ítem es «necesario» (hace falta para cursar) o «recomendado» (sugerido). El link suele ser a Mundo Parts,
// la tienda socia: la academia solo lo enlaza, la venta no pasa por este sistema.
type K = { nombre: string; descripcion: string; precio: string; link: string; requerido: boolean }

export function KitEditor({ name, inicial }: { name: string; inicial: K[] }) {
  const [rows, setRows] = useState<K[]>(inicial)
  const upd = (i: number, p: Partial<K>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const errK = rows.some((r) => !limpiar(r.nombre)) ? 'Completá el nombre de cada ítem o quitá el que sobra.' : rows.some((r) => r.precio !== '' && Number(r.precio) < 0) ? 'El precio no puede ser negativo.' : ''
  const txt = rows.filter((r) => limpiar(r.nombre)).map((r) => [r.nombre, r.descripcion, r.precio, r.link, r.requerido ? 'necesario' : 'recomendado'].map(limpiar).join(' | ')).join('\n')
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
            <div><label className="label">Tipo</label>
              <select className="input" value={r.requerido ? 'necesario' : 'recomendado'} onChange={(e) => upd(i, { requerido: e.target.value === 'necesario' })}>
                <option value="necesario">Necesario para cursar</option><option value="recomendado">Recomendado (opcional)</option>
              </select></div>
            <div><label className="label">Descripción</label><input className="input" placeholder="Ej: Para medir tensión y continuidad" value={r.descripcion} onChange={(e) => upd(i, { descripcion: e.target.value })} /></div>
            <div><label className="label">Precio de referencia (ARS)</label><input type="number" min={0} className="input" placeholder="Ej: 15000" value={r.precio} onChange={(e) => upd(i, { precio: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Link de compra (opcional)</label>
              <input type="url" className="input" placeholder="https://www.mundopartsrepuestos.com/…" value={r.link} onChange={(e) => upd(i, { link: e.target.value })} />
              <button type="button" onClick={() => upd(i, { link: MUNDO_PARTS_URL })} className="mt-1 text-xs text-secondary hover:underline">Usar la tienda de Mundo Parts</button></div>
          </div>
          <div className="mt-3 flex justify-end"><RemoveButton onClick={() => setRows(rows.filter((_, j) => j !== i))} label="Quitar ítem" /></div>
        </div>
      ))}
      <AddButton onClick={() => setRows([...rows, { nombre: '', descripcion: '', precio: '', link: '', requerido: true }])}>Agregar ítem</AddButton>
    </div>
  )
}

// ── Estructura del curso: módulos → clases (RF-26, RF-31) ─────────────────────────────────────
// Curso: módulos con sus clases (sin clases sueltas ni módulos vacíos). Taller: solo clases, sin módulos.
// Serializa JSON {modulos:[{id?,titulo}], clases:[{id?,titulo,tipo,modulo}]} que entiende guardarEstructura.
// Las clases conservan su id: si cambian de lugar o de módulo, su material y sus fechas las siguen.
export type TipoClase = 'teorica' | 'practica'
type EC = { key: string; id?: string; titulo: string; tipo: TipoClase }
type EM = { key: string; id?: string; titulo: string; clases: EC[] }
let nKey = 0
const k = () => `n${++nKey}`

export function EstructuraEditor({ name, taller, inicial, conMaterial }: {
  name: string; taller: boolean
  inicial: { modulos: { id: string; titulo: string }[]; clases: { id: string; titulo: string; tipo: TipoClase; modulo_id: string | null }[] }
  conMaterial: Record<string, number> // id de clase → cantidad de materiales
}) {
  const [mods, setMods] = useState<EM[]>(() => {
    const cl = (c: (typeof inicial.clases)[number]): EC => ({ key: c.id, id: c.id, titulo: c.titulo, tipo: c.tipo })
    if (taller) return [{ key: 'taller', titulo: '', clases: inicial.clases.map(cl) }]
    const out: EM[] = inicial.modulos.map((m) => ({ key: m.id, id: m.id, titulo: m.titulo, clases: inicial.clases.filter((c) => c.modulo_id === m.id).map(cl) }))
    const sueltas = inicial.clases.filter((c) => !c.modulo_id || !inicial.modulos.some((m) => m.id === c.modulo_id))
    if (sueltas.length) out.push({ key: k(), titulo: 'Sin módulo', clases: sueltas.map(cl) }) // datos previos a la estructura
    return out
  })
  const updM = (i: number, p: Partial<EM>) => setMods(mods.map((m, j) => (j === i ? { ...m, ...p } : m)))
  const updC = (i: number, c: number, p: Partial<EC>) => updM(i, { clases: mods[i].clases.map((x, j) => (j === c ? { ...x, ...p } : x)) })
  const mover = <T,>(arr: T[], i: number, d: number) => { const a = [...arr]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); return a }
  const aModulo = (i: number, c: number, dest: number) => {
    const x = mods[i].clases[c]
    setMods(mods.map((m, j) => j === i ? { ...m, clases: m.clases.filter((_, h) => h !== c) } : j === dest ? { ...m, clases: [...m.clases, x] } : m))
  }

  const clases = mods.flatMap((m) => m.clases)
  const errE = !taller && mods.some((m) => !limpiar(m.titulo)) ? 'Completá el título de cada módulo.'
    : !taller && mods.some((m) => limpiar(m.titulo).length > 120) ? 'Cada módulo puede tener hasta 120 caracteres.'
    : !taller && mods.some((m) => !m.clases.length) ? `El módulo «${limpiar(mods.find((m) => !m.clases.length)!.titulo) || 'sin título'}» no tiene clases: agregale al menos una o quitalo.`
    : clases.some((c) => !limpiar(c.titulo)) ? 'Completá el título de cada clase o quitá la que sobra.'
    : clases.some((c) => limpiar(c.titulo).length > 200) ? 'Cada clase puede tener hasta 200 caracteres.'
    : clases.length > 500 ? 'El plan admite hasta 500 clases.' : ''

  const ids = new Set(clases.map((c) => c.id).filter(Boolean))
  const quitadasConMaterial = inicial.clases.filter((c) => !ids.has(c.id) && conMaterial[c.id])
  const json = JSON.stringify({
    modulos: taller ? [] : mods.map((m) => ({ id: m.id, titulo: limpiar(m.titulo) })),
    clases: mods.flatMap((m, i) => m.clases.map((c) => ({ id: c.id, titulo: limpiar(c.titulo), tipo: c.tipo, modulo: taller ? null : i }))),
  })

  let n = 0
  const filaClase = (i: number, c: EC, ci: number) => {
    n++
    const m = mods[i]
    return (
      <div key={c.key} className="flex flex-wrap items-end gap-2">
        <span className="w-8 shrink-0 pb-2 text-center text-sm font-semibold text-on-surface-variant" aria-hidden>{n}</span>
        <div className="min-w-[12rem] flex-1">
          <input aria-label={`Título de la clase ${n}`} className="input" maxLength={200} placeholder="Ej: Introducción" value={c.titulo} onChange={(e) => updC(i, ci, { titulo: e.target.value })} /></div>
        <div>
          <select aria-label={`Tipo de la clase ${n}`} className="input" value={c.tipo} onChange={(e) => updC(i, ci, { tipo: e.target.value as TipoClase })}>
            <option value="teorica">Teórica</option><option value="practica">Práctica</option>
          </select></div>
        {!taller && mods.length > 1 && (
          <div>
            <select aria-label={`Mover la clase ${n} a otro módulo`} className="input" value={i} onChange={(e) => aModulo(i, ci, Number(e.target.value))}>
              {mods.map((x, j) => <option key={x.key} value={j}>{j === i ? 'Mover a…' : `→ ${limpiar(x.titulo) || `Módulo ${j + 1}`}`}</option>)}
            </select></div>
        )}
        <OrdenBotones label={`la clase ${n}`} arriba={ci > 0 ? () => updM(i, { clases: mover(m.clases, ci, -1) }) : undefined}
          abajo={ci < m.clases.length - 1 ? () => updM(i, { clases: mover(m.clases, ci, 1) }) : undefined} />
        <RemoveButton onClick={() => updM(i, { clases: m.clases.filter((_, j) => j !== ci) })} label={`Quitar la clase ${n}`} />
        {c.id && conMaterial[c.id] ? <p className="basis-full pl-10 text-xs text-on-surface-variant">{conMaterial[c.id]} material{conMaterial[c.id] === 1 ? '' : 'es'}</p> : null}
      </div>
    )
  }
  const nuevaClase = (): EC => ({ key: k(), titulo: '', tipo: 'teorica' })

  return (
    <div className="space-y-4">
      <Serial name={name} value={json} />
      <Guard error={errE} />
      {taller ? (
        <div className="space-y-2">
          {!mods[0].clases.length && <p className="text-sm text-on-surface-variant">Todavía no hay clases. Los talleres no llevan módulos.</p>}
          {mods[0].clases.map((c, ci) => filaClase(0, c, ci))}
          <AddButton onClick={() => updM(0, { clases: [...mods[0].clases, nuevaClase()] })}>Agregar clase</AddButton>
        </div>
      ) : (
        <>
          {!mods.length && <p className="text-sm text-on-surface-variant">Todavía no hay módulos. Cada módulo agrupa sus clases (teóricas o prácticas).</p>}
          {mods.map((m, i) => (
            <div key={m.key} className="rounded border border-outline-variant p-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1"><label className="label">Módulo {i + 1}</label>
                  <input className="input" maxLength={120} placeholder="Ej: Fundamentos" value={m.titulo} onChange={(e) => updM(i, { titulo: e.target.value })} /></div>
                <OrdenBotones label={`el módulo ${i + 1}`} arriba={i > 0 ? () => setMods(mover(mods, i, -1)) : undefined}
                  abajo={i < mods.length - 1 ? () => setMods(mover(mods, i, 1)) : undefined} />
                <RemoveButton onClick={() => setMods(mods.filter((_, j) => j !== i))} label={`Quitar el módulo ${i + 1}`}
                  disabled={m.clases.length ? 'Para quitar el módulo, mové sus clases a otro o quitalas' : undefined} />
              </div>
              <div className="mt-3 space-y-2">
                {m.clases.map((c, ci) => filaClase(i, c, ci))}
                <AddButton onClick={() => updM(i, { clases: [...m.clases, nuevaClase()] })}>Agregar clase</AddButton>
              </div>
            </div>
          ))}
          <AddButton onClick={() => setMods([...mods, { key: k(), titulo: '', clases: [nuevaClase()] }])}>Agregar módulo</AddButton>
        </>
      )}
      {quitadasConMaterial.length > 0 && (
        <p role="status" className="rounded border border-amber-400/50 p-3 text-sm text-amber-300">
          Al guardar, el material de {quitadasConMaterial.map((c) => `«${c.titulo}» (${conMaterial[c.id]})`).join(', ')} va a quedar como <strong>material general</strong>. No se borra.
        </p>
      )}
      {errE && <p role="alert" className="text-sm text-red-400">{errE}</p>}
    </div>
  )
}

function OrdenBotones({ label, arriba, abajo }: { label: string; arriba?: () => void; abajo?: () => void }) {
  const cls = 'grid h-9 w-9 shrink-0 place-items-center rounded border border-outline-variant text-on-surface-variant hover:text-on-surface disabled:opacity-30'
  return (
    <div className="flex gap-1">
      <button type="button" className={cls} disabled={!arriba} onClick={arriba} aria-label={`Subir ${label}`} title="Subir"><ArrowUp size={15} aria-hidden /></button>
      <button type="button" className={cls} disabled={!abajo} onClick={abajo} aria-label={`Bajar ${label}`} title="Bajar"><ArrowDown size={15} aria-hidden /></button>
    </div>
  )
}

// ── Calendario de una edición: fecha y estado de cada clase del plan ────────────────────────────
type C = { numero: number; titulo: string; fecha: string; estado: string }

// Fechas desde `inicio` que caen en los días de la semana dados (0=Domingo … 6=Sábado).
function generarFechas(inicio: string, dias: number[], cantidad: number): string[] {
  if (!inicio || !dias.length) return []
  const d = new Date(`${inicio}T12:00:00Z`) // mediodía UTC: sin corrimientos de huso
  const out: string[] = []
  for (let n = 0; out.length < cantidad && n < 3700; n++, d.setUTCDate(d.getUTCDate() + 1)) {
    if (dias.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10))
  }
  return out
}

// Las filas son las clases del plan del curso (los títulos no se editan acá). Al crear o duplicar una edición
// las fechas empiezan vacías: «Proponer fechas» las arma desde la fecha de inicio y los días de cursada (R8).
export function ClasesEditor({ name, plan, inicial, inicio, dias, avisar }: {
  name: string; plan: { numero: number; titulo: string }[]; inicial: { numero: number; fecha: string; estado: string }[]
  inicio?: string | null; dias?: number[]; avisar?: React.ReactNode
}) {
  const previo = new Map(inicial.map((c) => [c.numero, c]))
  const [rows, setRows] = useState<C[]>(plan.map((p) => ({ ...p, fecha: previo.get(p.numero)?.fecha ?? '', estado: previo.get(p.numero)?.estado ?? 'programada' })))
  const upd = (i: number, p: Partial<C>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const conFecha = rows.filter((r) => r.fecha)
  const fechas = conFecha.map((r) => r.fecha)
  const errC = !conFecha.length ? 'Asigná la fecha de al menos una clase.'
    : new Set(fechas).size < fechas.length ? 'Hay dos clases en la misma fecha.'
    : fechas.some((f, i) => i > 0 && f < fechas[i - 1]) ? 'Las fechas tienen que seguir el orden de las clases.'
    : inicio && fechas[0] < inicio ? `Ninguna clase puede ser anterior al inicio de la edición (${inicio.split('-').reverse().join('/')}).` : ''
  const puedeGenerar = !!inicio && !!dias?.length
  const generar = () => {
    const f = generarFechas(inicio!, dias!, rows.length)
    setRows(rows.map((r, i) => ({ ...r, fecha: f[i] ?? '' })))
  }
  const sinFecha = rows.length - conFecha.length
  if (!plan.length) return <p className="text-sm text-on-surface-variant">El curso todavía no tiene plan de clases. Cargalo en la pestaña «Plan de clases» del curso.</p>
  return (
    <div className="space-y-4">
      <Serial name={name} value={conFecha.map((r) => `${r.numero} | ${r.fecha} | ${r.estado}`).join('\n')} />
      <Guard error={errC} />
      <div className="flex flex-wrap items-center gap-2 rounded border border-dashed border-outline-variant p-3">
        <button type="button" disabled={!puedeGenerar} onClick={generar} className="btn-ghost !px-3 !py-2 disabled:opacity-50"><Wand2 size={14} aria-hidden /> Proponer fechas</button>
        <p className="min-w-[12rem] flex-1 text-xs text-on-surface-variant">
          {puedeGenerar ? 'Asigna una fecha a cada clase desde el inicio de la edición, en los días de cursada. Después podés ajustarlas.' : 'Para proponer fechas, cargá antes la fecha de inicio (Datos) y los horarios de la edición.'}
        </p>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.numero} className="flex flex-wrap items-end gap-2">
            <span className="w-8 shrink-0 pb-2 text-center text-sm font-semibold text-on-surface-variant" aria-hidden>{r.numero}</span>
            <p className="min-w-[10rem] flex-1 pb-2 text-sm">{r.titulo}</p>
            <div><label className="sr-only">Fecha clase {r.numero}</label><input type="date" className="input" min={inicio ?? undefined} value={r.fecha} onChange={(e) => upd(i, { fecha: e.target.value })} /></div>
            <div><label className="sr-only">Estado clase {r.numero}</label>
              <select className="input" value={r.estado} onChange={(e) => upd(i, { estado: e.target.value })}>
                <option value="programada">Programada</option><option value="suspendida">Suspendida</option><option value="reprogramada">Reprogramada</option>
              </select></div>
          </div>
        ))}
      </div>
      {sinFecha > 0 && !errC && <p className="text-sm text-secondary">{sinFecha} clase{sinFecha === 1 ? '' : 's'} sin fecha: no se mostrarán en el calendario de esta edición.</p>}
      {errC && <p role="alert" className="text-sm text-red-400">{errC}</p>}
      {avisar}
    </div>
  )
}
