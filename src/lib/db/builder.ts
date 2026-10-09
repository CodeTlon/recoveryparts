// Constructor de consultas con la misma forma que usaba el código con supabase-js
// (from().select().eq()…, rpc()) pero sobre Postgres plano. Cubre solo lo que el proyecto usa:
// select con embeds (resueltos por las FK), eq/neq/in/is/gt/gte/lt/lte, order, limit,
// single/maybeSingle, conteos, insert/update/upsert/delete y rpc.
// Es puro (sin server-only): recibe la función `run` que ejecuta SQL con el rol y usuario de la request.

export type DbError = { message: string; code?: string; details?: string; hint?: string }
export type Result<T = any[]> = { data: T | null; error: DbError | null; count: number | null }
export type Run = (text: string, params: any[]) => Promise<any[]>

type FK = { name: string; table: string; cols: string[]; ref: string; refCols: string[] }
export type Meta = {
  fks: FK[]
  pks: Record<string, string[]>
  funcs: Record<string, { set: boolean; tipo: string; tipoNombre: string }>
}

const IDENT = /^[a-z_][a-z0-9_]*$/
const q = (id: string) => {
  if (!IDENT.test(id)) throw new Error(`Identificador inválido: ${id}`)
  return `"${id}"`
}

export async function cargarMeta(run: Run): Promise<Meta> {
  const fks = await run(
    `select c.conname as name, t.relname as "table", rt.relname as ref,
       (select array_agg(a.attname order by k.ord) from unnest(c.conkey) with ordinality k(n, ord)
          join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.n) as cols,
       (select array_agg(a.attname order by k.ord) from unnest(c.confkey) with ordinality k(n, ord)
          join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.n) as "refCols"
     from pg_constraint c
     join pg_class t on t.oid = c.conrelid join pg_class rt on rt.oid = c.confrelid
     join pg_namespace n on n.oid = t.relnamespace
     where c.contype = 'f' and n.nspname = 'public' and rt.relnamespace = n.oid`, [])
  const pks = await run(
    `select t.relname as tabla, array_agg(a.attname order by k.ord) as cols
     from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
     cross join lateral unnest(c.conkey) with ordinality k(n, ord)
     join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.n
     where c.contype = 'p' and n.nspname = 'public' group by t.relname`, [])
  const funcs = await run(
    `select p.proname, p.proretset, ty.typtype, ty.typname
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type ty on ty.oid = p.prorettype
     where n.nspname = 'public'`, [])
  return {
    fks: fks as FK[],
    pks: Object.fromEntries(pks.map((r) => [r.tabla, r.cols])),
    funcs: Object.fromEntries(funcs.map((r) => [r.proname, { set: r.proretset, tipo: r.typtype, tipoNombre: r.typname }])),
  }
}

// ── select: "a, b, rel(c, d), alias:rel!fk(e), rel!inner(f)" ──────────────────────────────
type Item =
  | { k: 'star' }
  | { k: 'col'; name: string }
  | { k: 'embed'; alias: string; rel: string; hint?: string; inner: boolean; items: Item[] }

function dividir(s: string): string[] {
  const out: string[] = []
  let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out
}

export function parseSelect(s: string): Item[] {
  return dividir(s).map((raw) => {
    const t = raw.trim()
    if (t === '*') return { k: 'star' } as Item
    const par = t.indexOf('(')
    if (par === -1) return { k: 'col', name: t } as Item
    if (!t.endsWith(')')) throw new Error(`select inválido: ${t}`)
    let cabeza = t.slice(0, par)
    let alias = ''
    const dp = cabeza.indexOf(':')
    if (dp !== -1) { alias = cabeza.slice(0, dp); cabeza = cabeza.slice(dp + 1) }
    const [rel, ...marcas] = cabeza.split('!')
    return {
      k: 'embed', alias: alias || rel, rel,
      hint: marcas.find((m) => m !== 'inner'),
      inner: marcas.includes('inner'),
      items: parseSelect(t.slice(par + 1, -1)),
    } as Item
  })
}

type Filtro = { col: string; op: string; val?: any }
type Order = { col: string; asc: boolean }

class Ctx {
  params: any[] = []
  n = 0
  add(v: any) { this.params.push(v); return `$${this.params.length}` }
  alias() { return `t${++this.n}` }
}

function relacion(meta: Meta, padre: string, rel: string, hint?: string): { fk: FK; objeto: boolean } {
  const cand = meta.fks.filter((f) =>
    hint ? f.name === hint : (f.table === padre && f.ref === rel) || (f.table === rel && f.ref === padre))
  const dir = cand.filter((f) => (f.table === padre && f.ref === rel) || (f.table === rel && f.ref === padre))
  if (dir.length !== 1) throw new Error(`Relación ${padre} → ${rel} ${dir.length ? 'ambigua' : 'inexistente'} (usar !fk)`)
  return { fk: dir[0], objeto: dir[0].table === padre && dir[0].ref === rel }
}

function cond(alias: string, f: Filtro, ctx: Ctx): string {
  const c = `${alias}.${q(f.col)}`
  switch (f.op) {
    case 'eq': return f.val === null ? `${c} is null` : `${c} = ${ctx.add(f.val)}`
    case 'neq': return f.val === null ? `${c} is not null` : `${c} is distinct from ${ctx.add(f.val)}`
    case 'gt': return `${c} > ${ctx.add(f.val)}`
    case 'gte': return `${c} >= ${ctx.add(f.val)}`
    case 'lt': return `${c} < ${ctx.add(f.val)}`
    case 'lte': return `${c} <= ${ctx.add(f.val)}`
    case 'is': return f.val === null ? `${c} is null` : `${c} is ${f.val ? 'true' : 'false'}`
    case 'not': return `not (${cond(alias, { col: f.col, op: f.val.op, val: f.val.val }, ctx)})`
    case 'buscar': {
      const p = ctx.add(`%${String(f.val).replace(/[\\%_]/g, '\\$&')}%`)
      return `(${f.col.split(',').map((k) => `${alias}.${q(k)} ilike ${p}`).join(' or ')})`
    }
    case 'in': return `${c}::text = any(${ctx.add((f.val as any[]).map(String))}::text[])`
  }
  throw new Error(`Operador no soportado: ${f.op}`)
}

function dondeEmbed(filtros: Filtro[], nombre: string, alias: string, ctx: Ctx): string[] {
  return filtros.filter((f) => f.col.startsWith(nombre + '.')).map((f) => cond(alias, { ...f, col: f.col.slice(nombre.length + 1) }, ctx))
}

function union(fk: FK, objeto: boolean, hijo: string, padre: string): string {
  return fk.cols.map((c, i) =>
    objeto ? `${hijo}.${q(fk.refCols[i])} = ${padre}.${q(c)}` : `${hijo}.${q(c)} = ${padre}.${q(fk.refCols[i])}`).join(' and ')
}

function proyeccion(tabla: string, alias: string, items: Item[], filtros: Filtro[], meta: Meta, ctx: Ctx): string {
  const partes: string[] = []
  let estrella = false
  for (const it of items) {
    if (it.k === 'star') { estrella = true; continue }
    if (it.k === 'col') { partes.push(`${ctx.add(it.name)}::text, ${alias}.${q(it.name)}`); continue }
    const { fk, objeto } = relacion(meta, tabla, it.rel, it.hint)
    const h = ctx.alias()
    const w = [union(fk, objeto, h, alias), ...dondeEmbed(filtros, it.alias, h, ctx)].join(' and ')
    const sub = proyeccion(it.rel, h, it.items, [], meta, ctx)
    partes.push(`${ctx.add(it.alias)}::text, ` + (objeto
      ? `(select ${sub} from public.${q(it.rel)} ${h} where ${w} limit 1)`
      : `coalesce((select jsonb_agg(${sub}) from public.${q(it.rel)} ${h} where ${w}), '[]'::jsonb)`))
  }
  const obj = partes.length ? `jsonb_build_object(${partes.join(', ')})` : ''
  if (estrella) return obj ? `(to_jsonb(${alias}) || ${obj})` : `to_jsonb(${alias})`
  return obj || `'{}'::jsonb`
}

function existeInner(tabla: string, alias: string, items: Item[], filtros: Filtro[], meta: Meta, ctx: Ctx): string[] {
  return items.filter((i): i is Extract<Item, { k: 'embed' }> => i.k === 'embed' && i.inner).map((it) => {
    const { fk, objeto } = relacion(meta, tabla, it.rel, it.hint)
    const h = ctx.alias()
    const w = [union(fk, objeto, h, alias), ...dondeEmbed(filtros, it.alias, h, ctx)].join(' and ')
    return `exists (select 1 from public.${q(it.rel)} ${h} where ${w})`
  })
}

type Op = 'select' | 'insert' | 'update' | 'upsert' | 'delete'

export class QB<T = any[]> implements PromiseLike<Result<T>> {
  private op: Op = 'select'
  private cols = '*'
  private conteo = false
  private head = false
  private filtros: Filtro[] = []
  private orden: Order[] = []
  private lim: number | null = null
  private modo: 'many' | 'single' | 'maybe' = 'many'
  private payload: any
  private conflicto?: string
  private returning = false

  constructor(private tabla: string, private run: Run, private meta: () => Promise<Meta>) {}

  select(cols = '*', opts?: { count?: 'exact'; head?: boolean }) {
    if (this.op !== 'select') this.returning = true
    this.cols = cols
    if (opts?.count) this.conteo = true
    if (opts?.head) this.head = true
    return this
  }
  insert(rows: any) { this.op = 'insert'; this.payload = rows; return this }
  update(row: any) { this.op = 'update'; this.payload = row; return this }
  upsert(rows: any, opts?: { onConflict?: string }) { this.op = 'upsert'; this.payload = rows; this.conflicto = opts?.onConflict; return this }
  delete() { this.op = 'delete'; return this }

  eq(col: string, val: any) { this.filtros.push({ col, op: 'eq', val }); return this }
  neq(col: string, val: any) { this.filtros.push({ col, op: 'neq', val }); return this }
  gt(col: string, val: any) { this.filtros.push({ col, op: 'gt', val }); return this }
  gte(col: string, val: any) { this.filtros.push({ col, op: 'gte', val }); return this }
  lt(col: string, val: any) { this.filtros.push({ col, op: 'lt', val }); return this }
  lte(col: string, val: any) { this.filtros.push({ col, op: 'lte', val }); return this }
  is(col: string, val: null | boolean) { this.filtros.push({ col, op: 'is', val }); return this }
  in(col: string, val: any[]) { this.filtros.push({ col, op: 'in', val }); return this }
  not(col: string, op: 'is' | 'eq' | 'in', val: any) { this.filtros.push({ col, op: 'not', val: { op, val } }); return this }
  order(col: string, opts?: { ascending?: boolean }) { this.orden.push({ col, asc: opts?.ascending !== false }); return this }
  limit(n: number) { this.lim = n; return this }
  single() { this.modo = 'single'; return this as unknown as QB<any> }
  maybeSingle() { this.modo = 'maybe'; return this as unknown as QB<any> }
  // Búsqueda sin distinguir mayúsculas en varias columnas (reemplaza or('a.ilike.%x%,b.ilike.%x%')).
  buscar(cols: string[], texto: string) { this.filtros.push({ col: cols.join(','), op: 'buscar', val: texto }); return this }

  then<A = Result<T>, B = never>(ok?: ((v: Result<T>) => A | PromiseLike<A>) | null, ko?: ((e: any) => B | PromiseLike<B>) | null) {
    return this.ejecutar().then(ok, ko)
  }

  private where(alias: string, items: Item[], meta: Meta, ctx: Ctx): string {
    const propios = this.filtros.filter((f) => !f.col.includes('.') || f.op === 'buscar').map((f) => cond(alias, f, ctx))
    const w = [...propios, ...existeInner(this.tabla, alias, items, this.filtros, meta, ctx)]
    return w.length ? ` where ${w.join(' and ')}` : ''
  }

  private async ejecutar(): Promise<Result<T>> {
    return (await this.ejecutarSql()) as Result<T>
  }

  private async ejecutarSql(): Promise<Result<any>> {
    try {
      const meta = await this.meta()
      const ctx = new Ctx()
      const t = this.tabla
      const T = `public.${q(t)}`
      let rows: any[]
      let count: number | null = null

      if (this.op === 'select') {
        const items = parseSelect(this.cols)
        const a = ctx.alias()
        const w = this.where(a, items, meta, ctx)
        if (this.conteo) {
          const c = await this.run(`select count(*)::int as n from ${T} ${a}${w}`, ctx.params)
          count = c[0].n
        }
        if (this.head) return { data: null, error: null, count }
        const ctx2 = new Ctx()
        const a2 = ctx2.alias()
        const proy = proyeccion(t, a2, items, this.filtros, meta, ctx2)
        const w2 = this.where(a2, items, meta, ctx2)
        const ord = this.orden.length ? ` order by ${this.orden.map((o) => `${a2}.${q(o.col)} ${o.asc ? 'asc' : 'desc'}`).join(', ')}` : ''
        const lim = this.lim !== null ? ` limit ${Number(this.lim)}` : this.modo !== 'many' ? ' limit 2' : ''
        rows = (await this.run(`select ${proy} as r from ${T} ${a2}${w2}${ord}${lim}`, ctx2.params)).map((r) => r.r)
      } else {
        rows = await this.escribir(meta, ctx, T)
        if (this.returning) {
          const items = parseSelect(this.cols)
          if (items.some((i) => i.k === 'embed')) throw new Error('Embeds no soportados en returning')
          if (!items.some((i) => i.k === 'star')) {
            const nombres = items.map((i) => (i as any).name as string)
            rows = rows.map((r) => Object.fromEntries(nombres.map((n) => [n, r[n]])))
          }
        } else if (this.modo === 'many') {
          return { data: null, error: null, count: null }
        }
      }

      if (this.modo === 'many') return { data: rows, error: null, count }
      if (rows.length === 1) return { data: rows[0], error: null, count }
      if (rows.length === 0 && this.modo === 'maybe') return { data: null, error: null, count }
      return { data: null, count: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } }
    } catch (e: any) {
      return { data: null, count: null, error: { message: e.message, code: e.code, details: e.detail, hint: e.hint } }
    }
  }

  private async escribir(meta: Meta, ctx: Ctx, T: string): Promise<any[]> {
    const t = this.tabla
    const ret = ` returning to_jsonb(${q('x')}) as r`
    if (this.op === 'delete') {
      const w = this.where(q('x'), [], meta, ctx)
      const res = await this.run(`delete from ${T} as ${q('x')}${w}${ret}`, ctx.params)
      return res.map((r) => r.r)
    }
    if (this.op === 'update') {
      const cols = Object.keys(this.payload)
      if (!cols.length) throw new Error('update sin columnas')
      const set = cols.map((c) => `${q(c)} = ${q('p')}.${q(c)}`).join(', ')
      const ph = ctx.add(this.payload)
      const w = this.where(q('x'), [], meta, ctx)
      const res = await this.run(
        `update ${T} as ${q('x')} set ${set} from jsonb_populate_record(null::${T}, ${ph}::jsonb) as ${q('p')}${w}${ret}`, ctx.params)
      return res.map((r) => r.r)
    }
    const filas = Array.isArray(this.payload) ? this.payload : [this.payload]
    if (!filas.length) return []
    const cols = [...new Set(filas.flatMap((f: any) => Object.keys(f)))]
    const lista = cols.map(q).join(', ')
    const ph = ctx.add(filas)
    let sql = `insert into ${T} as ${q('x')} (${lista}) select ${lista} from jsonb_populate_recordset(null::${T}, ${ph}::jsonb)`
    if (this.op === 'upsert') {
      const clave = this.conflicto ? this.conflicto.split(',').map((s) => s.trim()) : meta.pks[t]
      if (!clave?.length) throw new Error(`upsert sin clave en ${t}`)
      const sets = cols.filter((c) => !clave.includes(c)).map((c) => `${q(c)} = excluded.${q(c)}`)
      sql += ` on conflict (${clave.map(q).join(', ')}) ` + (sets.length ? `do update set ${sets.join(', ')}` : 'do nothing')
    }
    const res = await this.run(sql + ret, ctx.params)
    return res.map((r) => r.r)
  }
}

export async function rpc(nombre: string, args: Record<string, any>, run: Run, meta: () => Promise<Meta>): Promise<Result<any>> {
  try {
    const m = await meta()
    const f = m.funcs[nombre]
    if (!f) throw new Error(`Función inexistente: ${nombre}`)
    const claves = Object.keys(args ?? {})
    const ctx = new Ctx()
    const llamada = `public.${q(nombre)}(${claves.map((k) => `${q(k)} => ${ctx.add(args[k])}`).join(', ')})`
    const filas = f.tipoNombre === 'void'
      ? (await run(`select ${llamada}`, ctx.params), [{ r: null }])
      : f.tipo === 'c' || (f.tipo === 'p' && f.tipoNombre === 'record')
      ? await run(`select to_jsonb(r) as r from ${llamada} r`, ctx.params)
      : await run(`select ${llamada} as r`, ctx.params)
    const data = f.set ? filas.map((x) => x.r) : (filas[0]?.r ?? null)
    return { data, error: null, count: null }
  } catch (e: any) {
    return { data: null, count: null, error: { message: e.message, code: e.code, details: e.detail, hint: e.hint } }
  }
}
