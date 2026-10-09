'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CornerDownRight, FileText, MoreHorizontal, Plus, Trash2, Wand2 } from 'lucide-react'
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

// ── Piezas compartidas por la estructura y el calendario ──────────────────────────────────────
// Número de clase en un círculo.
function Num({ n }: { n: number }) {
  return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-container-highest text-xs font-bold text-on-surface" aria-hidden>{n}</span>
}

// Botón ancho con borde punteado para agregar una fila o un bloque.
function AgregarFila({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-dashed border-outline-variant px-3 text-sm font-semibold text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary">
      <Plus size={15} aria-hidden /> {children}
    </button>
  )
}

// Bloque de un módulo: cabecera con franja naranja y el contenido debajo.
function BloqueModulo({ cabecera, children }: { cabecera?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container-low">
      {cabecera && <header className="rounded-t-lg border-b border-l-4 border-outline-variant border-l-accent bg-surface-container-high py-2.5 pl-3 pr-2 sm:pl-4">{cabecera}</header>}
      {children}
    </section>
  )
}

// Menú «⋯» de acciones de una fila: agrupa subir, bajar, mover y quitar para que cada fila entre en un renglón.
// Se cierra con Escape (vuelve el foco al botón) o al tocar afuera; las opciones se recorren con Tab.
type Accion = { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean; nota?: string } | 'sep'

function MenuAcciones({ label, acciones }: { label: string; acciones: Accion[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const fuera = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); boton.current?.focus() } }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    ref.current?.querySelector<HTMLButtonElement>('[role=menuitem]:not([disabled])')?.focus()
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla) }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button ref={boton} type="button" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
        className={`grid h-10 w-10 place-items-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface ${open ? 'bg-surface-container-highest text-on-surface' : ''}`}>
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open && (
        <div id={id} role="menu" aria-label={label}
          className="absolute right-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-outline-variant bg-surface-container-high py-1 shadow-xl shadow-black/40">
          {acciones.map((a, i) => a === 'sep' ? <div key={i} role="separator" className="my-1 border-t border-outline-variant" /> : (
            <button key={i} type="button" role="menuitem" disabled={a.disabled}
              onClick={() => { setOpen(false); a.onClick() }}
              className={`flex min-h-[44px] w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${a.danger ? 'text-red-300 hover:bg-red-500/10' : 'text-on-surface hover:bg-surface-container-highest'}`}>
              <span className="w-4 shrink-0 text-on-surface-variant" aria-hidden>{a.icon}</span>
              <span className="min-w-0">
                <span className="block">{a.label}</span>
                {a.nota && <span className="block text-xs text-on-surface-variant">{a.nota}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
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

// Selector de dos opciones (teórica / práctica): más rápido que un desplegable y entra en la fila.
function TipoToggle({ value, onChange, label }: { value: TipoClase; onChange: (v: TipoClase) => void; label: string }) {
  const op = (v: TipoClase, texto: string) => (
    <button type="button" aria-pressed={value === v} onClick={() => onChange(v)}
      className={`px-3 py-2 text-xs font-semibold transition-colors sm:py-1.5 ${value === v
        ? v === 'practica' ? 'bg-secondary/20 text-secondary' : 'bg-primary/15 text-primary'
        : 'text-on-surface-variant hover:text-on-surface'}`}>{texto}</button>
  )
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 divide-x divide-outline-variant overflow-hidden rounded-full border border-outline-variant">
      {op('teorica', 'Teórica')}{op('practica', 'Práctica')}
    </div>
  )
}

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
  const nombreModulo = (j: number) => limpiar(mods[j].titulo) || `Módulo ${j + 1}`

  // Una fila por clase en escritorio; en el celular, número + título arriba y tipo, material y menú abajo.
  let n = 0
  const filaClase = (i: number, c: EC, ci: number) => {
    n++
    const m = mods[i]
    const mat = c.id ? conMaterial[c.id] ?? 0 : 0
    const acciones: Accion[] = [
      { label: 'Subir', icon: <ArrowUp size={16} />, disabled: ci === 0, onClick: () => updM(i, { clases: mover(m.clases, ci, -1) }) },
      { label: 'Bajar', icon: <ArrowDown size={16} />, disabled: ci === m.clases.length - 1, onClick: () => updM(i, { clases: mover(m.clases, ci, 1) }) },
      ...(!taller && mods.length > 1 ? ['sep' as const, ...mods.flatMap((_, j): Accion[] => j === i ? [] : [{ label: `Mover a «${nombreModulo(j)}»`, icon: <CornerDownRight size={16} />, onClick: () => aModulo(i, ci, j) }])] : []),
      'sep',
      { label: 'Quitar clase', icon: <Trash2 size={16} />, danger: true, nota: mat ? 'Su material queda como general' : undefined, onClick: () => updM(i, { clases: m.clases.filter((_, j) => j !== ci) }) },
    ]
    return (
      <li key={c.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-[auto_1fr_auto_auto] sm:px-4">
        <Num n={n} />
        <input aria-label={`Título de la clase ${n}`} className="input min-w-0 !py-2" maxLength={200} placeholder="Título de la clase" value={c.titulo} onChange={(e) => updC(i, ci, { titulo: e.target.value })} />
        <div className="col-start-2 row-start-2 flex flex-wrap items-center gap-2 sm:col-start-auto sm:row-start-auto sm:w-48">
          <TipoToggle label={`Tipo de la clase ${n}`} value={c.tipo} onChange={(tipo) => updC(i, ci, { tipo })} />
          {mat > 0 && (
            <span title={`${mat} material${mat === 1 ? '' : 'es'}`} className="inline-flex items-center gap-1 rounded-full bg-surface-container-highest px-2 py-1 text-xs text-on-surface-variant">
              <FileText size={12} aria-hidden /> {mat}<span className="sr-only"> material{mat === 1 ? '' : 'es'}</span>
            </span>
          )}
        </div>
        <div className="col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto">
          <MenuAcciones label={`Acciones de la clase ${n}`} acciones={acciones} />
        </div>
      </li>
    )
  }
  const nuevaClase = (): EC => ({ key: k(), titulo: '', tipo: 'teorica' })

  return (
    <div className="space-y-4">
      <Serial name={name} value={json} />
      <Guard error={errE} />
      {taller ? (
        <BloqueModulo>
          {!mods[0].clases.length && <p className="px-4 pt-4 text-sm text-on-surface-variant">Todavía no hay clases. Los talleres no llevan módulos.</p>}
          <ul className="divide-y divide-outline-variant/50">{mods[0].clases.map((c, ci) => filaClase(0, c, ci))}</ul>
          <div className="p-2 sm:px-4 sm:pb-3"><AgregarFila onClick={() => updM(0, { clases: [...mods[0].clases, nuevaClase()] })}>Agregar clase</AgregarFila></div>
        </BloqueModulo>
      ) : (
        <>
          {!mods.length && <p className="text-sm text-on-surface-variant">Todavía no hay módulos. Cada módulo agrupa sus clases (teóricas o prácticas).</p>}
          {mods.map((m, i) => (
            <BloqueModulo key={m.key} cabecera={
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                    Módulo {i + 1} <span className="font-normal normal-case tracking-normal text-on-surface-variant">· {m.clases.length} clase{m.clases.length === 1 ? '' : 's'}</span>
                  </p>
                  <input aria-label={`Título del módulo ${i + 1}`} className="input min-w-0 !py-2 font-semibold" maxLength={120} placeholder="Título del módulo" value={m.titulo} onChange={(e) => updM(i, { titulo: e.target.value })} />
                </div>
                <MenuAcciones label={`Acciones del módulo ${i + 1}`} acciones={[
                  { label: 'Subir módulo', icon: <ArrowUp size={16} />, disabled: i === 0, onClick: () => setMods(mover(mods, i, -1)) },
                  { label: 'Bajar módulo', icon: <ArrowDown size={16} />, disabled: i === mods.length - 1, onClick: () => setMods(mover(mods, i, 1)) },
                  'sep',
                  { label: 'Quitar módulo', icon: <Trash2 size={16} />, danger: true, disabled: m.clases.length > 0, nota: m.clases.length ? 'Primero mové o quitá sus clases' : undefined, onClick: () => setMods(mods.filter((_, j) => j !== i)) },
                ]} />
              </div>
            }>
              <ul className="divide-y divide-outline-variant/50">{m.clases.map((c, ci) => filaClase(i, c, ci))}</ul>
              <div className="p-2 sm:px-4 sm:pb-3"><AgregarFila onClick={() => updM(i, { clases: [...m.clases, nuevaClase()] })}>Agregar clase</AgregarFila></div>
            </BloqueModulo>
          ))}
          <AgregarFila onClick={() => setMods([...mods, { key: k(), titulo: '', clases: [nuevaClase()] }])}>Agregar módulo</AgregarFila>
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

// ── Calendario de una edición: fecha y estado de cada clase del curso ───────────────────────────
type C = { id: string; numero: number; titulo: string; modulo?: string; fecha: string; estado: string }

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

// Las filas son las clases del curso en su orden (los títulos no se editan acá), agrupadas por módulo. Al crear o
// duplicar una edición las fechas empiezan vacías: «Proponer fechas» las arma desde la fecha de inicio y los días de
// cursada (R8). El orden es flexible: se puede adelantar una clase (fecha antes que otras) o saltearla (no se dicta).
export function ClasesEditor({ name, plan, inicial, inicio, dias, avisar }: {
  name: string; plan: { id: string; numero: number; titulo: string; modulo?: string }[]; inicial: { plan_clase_id: string; fecha: string; estado: string }[]
  inicio?: string | null; dias?: number[]; avisar?: React.ReactNode
}) {
  const previo = new Map(inicial.map((c) => [c.plan_clase_id, c]))
  const [rows, setRows] = useState<C[]>(plan.map((p) => ({ ...p, fecha: previo.get(p.id)?.fecha ?? '', estado: previo.get(p.id)?.estado ?? 'programada' })))
  const upd = (i: number, p: Partial<C>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const conFecha = rows.filter((r) => r.fecha)
  const dictadas = conFecha.filter((r) => r.estado !== 'salteada').map((r) => r.fecha)
  const primera = conFecha.map((r) => r.fecha).sort()[0]
  const errC = !conFecha.length ? 'Asigná la fecha de al menos una clase.'
    : new Set(dictadas).size < dictadas.length ? 'Hay dos clases en la misma fecha.'
    : inicio && primera < inicio ? `Ninguna clase puede ser anterior al inicio de la edición (${inicio.split('-').reverse().join('/')}).` : ''
  const puedeGenerar = !!inicio && !!dias?.length
  const generar = () => {
    const f = generarFechas(inicio!, dias!, rows.length)
    setRows(rows.map((r, i) => ({ ...r, fecha: f[i] ?? '' })))
  }
  const sinFecha = rows.length - conFecha.length
  // Bloques consecutivos por módulo (en talleres, un solo bloque sin cabecera).
  const grupos: { modulo?: string; filas: { r: C; i: number }[] }[] = []
  rows.forEach((r, i) => {
    const g = grupos.at(-1)
    if (g && g.modulo === r.modulo) g.filas.push({ r, i })
    else grupos.push({ modulo: r.modulo, filas: [{ r, i }] })
  })
  if (!plan.length) return <p className="text-sm text-on-surface-variant">El curso todavía no tiene clases. Cargalas en la pestaña «Estructura» del curso.</p>
  let nMod = 0
  return (
    <div className="space-y-4">
      <Serial name={name} value={conFecha.map((r) => `${r.id} | ${r.fecha} | ${r.estado}`).join('\n')} />
      <Guard error={errC} />
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-outline-variant p-3">
        <button type="button" disabled={!puedeGenerar} onClick={generar} className="btn-ghost !px-3 !py-2 disabled:opacity-50"><Wand2 size={14} aria-hidden /> Proponer fechas</button>
        <p className="min-w-[12rem] flex-1 text-xs text-on-surface-variant">
          {puedeGenerar ? 'Asigna una fecha a cada clase desde el inicio de la edición, en los días de cursada. Después podés ajustarlas.' : 'Para proponer fechas, cargá antes la fecha de inicio (Datos) y los horarios de la edición.'}
        </p>
      </div>
      <p className="text-xs text-on-surface-variant">Para <strong>adelantar</strong> una clase, poné su fecha antes que la de otras. Para <strong>saltearla</strong>, marcala «Salteada»: no se dicta y no cuenta para el N° de clase de deserción. El material lo liberás vos, clase por clase. Saltear o adelantar no avisa por mail.</p>
      {grupos.map((g, gi) => (
        <BloqueModulo key={gi} cabecera={g.modulo ? (
          <p className="pr-2 text-sm font-semibold"><span className="mr-1 text-[11px] uppercase tracking-wider text-secondary">Módulo {++nMod}</span> {g.modulo}</p>
        ) : undefined}>
          <ul className="divide-y divide-outline-variant/50">
            {g.filas.map(({ r, i }) => {
              const fuera = r.estado === 'salteada' || r.estado === 'suspendida'
              return (
                <li key={r.id} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-[auto_1fr_auto] sm:px-4">
                  <Num n={r.numero} />
                  <p className={`min-w-0 text-sm font-medium ${fuera ? 'text-on-surface-variant line-through decoration-on-surface-variant/60' : ''}`}>{r.titulo}</p>
                  <div className="col-span-2 flex gap-2 sm:col-span-1">
                    <input type="date" aria-label={`Fecha de ${r.titulo}`} className="input min-w-0 flex-1 !px-3 !py-2 sm:w-40 sm:flex-none" min={inicio ?? undefined} value={r.fecha} onChange={(e) => upd(i, { fecha: e.target.value })} />
                    <select aria-label={`Estado de ${r.titulo}`} className="input min-w-0 flex-1 !py-2 !pl-3 !pr-1 sm:w-40 sm:flex-none" value={r.estado} onChange={(e) => upd(i, { estado: e.target.value })}>
                      <option value="programada">Programada</option><option value="suspendida">Suspendida</option><option value="reprogramada">Reprogramada</option><option value="salteada">Salteada</option>
                    </select>
                  </div>
                </li>
              )
            })}
          </ul>
        </BloqueModulo>
      ))}
      {sinFecha > 0 && !errC && <p className="text-sm text-secondary">{sinFecha} clase{sinFecha === 1 ? '' : 's'} sin fecha: no se mostrarán en el calendario de esta edición.</p>}
      {errC && <p role="alert" className="text-sm text-red-400">{errC}</p>}
      {avisar}
    </div>
  )
}
