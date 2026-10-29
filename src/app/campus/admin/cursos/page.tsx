import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import { hoyAR } from '@/lib/fechas'
import { AREA_LABEL, TIPO_LABEL } from '@/lib/types'
import { ActionForm, Badge, Confirm, Empty, ModalButton, PageHead } from '@/components/campus/ui'
import Paginacion, { corregirPagina, paginaDe, rango } from '@/components/campus/Paginacion'
import { bajaCurso, reactivarCurso } from '../actions'

type Filtros = { pagina?: string; q?: string; area?: string; tipo?: string; estado?: string }

export default async function Cursos({ searchParams }: { searchParams: Promise<Filtros> }) {
  const sp = await searchParams
  const pagina = paginaDe(sp.pagina)
  const q = sp.q?.trim().slice(0, 80) || undefined
  const area = sp.area && sp.area in AREA_LABEL ? sp.area : undefined
  const tipo = sp.tipo && sp.tipo in TIPO_LABEL ? sp.tipo : undefined
  const estado = sp.estado === 'activos' || sp.estado === 'baja' ? sp.estado : undefined
  const { sb } = await requireRole('admin')
  const hoy = hoyAR()
  const [desde, hasta] = rango(pagina)
  let consulta = sb.from('cursos').select('id, nombre, slug, area, tipo, activo, destacado, ediciones(id, fecha_inicio, activo, inscripciones(id))', { count: 'exact' })
    .order('activo', { ascending: false }).order('nombre').order('id').range(desde, hasta)
  if (q) consulta = consulta.buscar(['nombre'], q)
  if (area) consulta = consulta.eq('area', area)
  if (tipo) consulta = consulta.eq('tipo', tipo)
  if (estado) consulta = consulta.eq('activo', estado === 'activos')
  const { data: cursos, count } = await consulta
  const total = count ?? 0
  const params = { q, area, tipo, estado }
  corregirPagina(pagina, total, params)
  const filtrando = !!(q || area || tipo || estado)
  // Chips de estado: conservan la búsqueda y los demás filtros, y vuelven a la página 1.
  const hrefEstado = (e?: string) => { const u = new URLSearchParams(Object.entries({ ...params, estado: e }).filter((x): x is [string, string] => !!x[1])); return `?${u}` }

  return (
    <>
      <PageHead title="Cursos y talleres" sub="Cada curso tiene sus ediciones (fechas, aula, profesor y alumnos). Entrá a uno para gestionarlo."
        action={<Link href="/campus/admin/cursos/nuevo" className="btn-primary"><Plus size={16} /> Crear curso</Link>} />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
          {([[undefined, 'Todos'], ['activos', 'Activos'], ['baja', 'De baja']] as const).map(([e, l]) => (
            <Link key={l} href={hrefEstado(e)} aria-current={estado === e ? 'page' : undefined}
              className={`inline-flex min-h-10 items-center rounded-lg border px-4 text-sm font-semibold ${estado === e ? 'border-on-surface bg-on-surface text-surface-container-lowest' : 'border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface'}`}>{l}</Link>
          ))}
        </div>
        {/* Formulario GET: los filtros quedan en la URL (se comparten y funcionan sin JS). */}
        <form role="search" aria-label="Buscar cursos" className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
          {estado && <input type="hidden" name="estado" value={estado} />}
          <input name="q" type="search" defaultValue={q} placeholder="Buscar curso" aria-label="Buscar curso por nombre" className="input min-w-40 flex-1 py-2! lg:max-w-56" />
          <select name="area" defaultValue={area ?? ''} aria-label="Área" className="input w-auto py-2!">
            <option value="">Todas las áreas</option>{Object.entries(AREA_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select name="tipo" defaultValue={tipo ?? ''} aria-label="Tipo" className="input w-auto py-2!">
            <option value="">Cursos y talleres</option>{Object.entries(TIPO_LABEL).map(([k, l]) => <option key={k} value={k}>{l}s</option>)}
          </select>
          <button className="btn-outline py-2!">Filtrar</button>
          {filtrando && <Link href="?" className="-my-2 inline-block py-2 text-sm font-semibold text-secondary hover:underline">Limpiar</Link>}
        </form>
      </div>

      {!cursos?.length ? <Empty>{filtrando ? 'Ningún curso coincide con los filtros.' : pagina > 1 ? 'No hay más cursos.' : 'Todavía no hay cursos. Creá el primero.'}</Empty> : (
        <div className="card overflow-x-auto">
          <table className="tabla w-full text-sm md:min-w-[720px]">
            <thead><tr className="text-left text-xs text-on-surface-variant"><th className="px-4 py-3">Curso</th><th className="hidden px-4 py-3 md:table-cell">Área</th><th className="px-4 py-3">Ediciones</th><th className="hidden px-4 py-3 md:table-cell">Próxima</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3" /></tr></thead>
            <tbody>
              {cursos.map((c: any) => (
                <tr key={c.id} className="border-t border-outline-variant">
                  <td className="px-4 py-3 font-medium"><Link href={`/campus/admin/cursos/${c.id}`} className="hover:text-accent">{c.nombre}</Link> <span className="ml-1 text-xs text-on-surface-variant">{TIPO_LABEL[c.tipo as 'curso']}</span></td>
                  <td className="hidden px-4 py-3 text-on-surface-variant md:table-cell">{AREA_LABEL[c.area as 'diseno']}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{(() => { const n = c.ediciones.filter((e: any) => e.activo).length, a = c.ediciones.reduce((k: number, e: any) => k + e.inscripciones.length, 0); return `${n} ${n === 1 ? 'activa' : 'activas'} · ${a} ${a === 1 ? 'alumno' : 'alumnos'}` })()}</td>
                  <td className="hidden px-4 py-3 text-on-surface-variant md:table-cell">{(() => { const p = c.ediciones.filter((e: any) => e.activo && e.fecha_inicio >= hoy).sort((a: any, b: any) => a.fecha_inicio.localeCompare(b.fecha_inicio))[0]; return p ? fechaAR(p.fecha_inicio) : '—' })()}</td>
                  <td className="px-4 py-3"><Badge tone={c.activo ? 'ok' : 'neutral'}>{c.activo ? 'Activo' : 'De baja'}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link href={`/campus/admin/cursos/${c.id}`} className="btn-ghost px-3! py-2!">Gestionar</Link>
                    {c.activo
                      ? <ActionForm action={bajaCurso} submit={null} reset={false} okLabel="Hecho" className="ml-2 inline"><input type="hidden" name="id" value={c.id} /><Confirm message="¿Dar de baja este curso? Dejará de verse en el sitio con todas sus ediciones.">Baja</Confirm></ActionForm>
                      : <span className="ml-2 inline-block">
                          <ModalButton label="Reactivar" title={`Reactivar ${c.nombre}`}>
                            <ActionForm action={reactivarCurso} submit="Reactivar" className="text-left">
                              <input type="hidden" name="id" value={c.id} />
                              <p className="text-sm text-on-surface-variant">Vuelve a verse en el sitio con sus ediciones activas. Para cada una se valida que su aula siga activa, que el cupo no supere la capacidad del aula y que no choque con otro curso en el mismo horario.</p>
                            </ActionForm>
                          </ModalButton>
                        </span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion pagina={pagina} total={total} params={params} que="cursos" />
    </>
  )
}
