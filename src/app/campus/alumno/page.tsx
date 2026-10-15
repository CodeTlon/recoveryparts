import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, CalendarDays, Download, ClipboardList, ArrowRight, FileText, GraduationCap } from 'lucide-react'
import { TIPO_CLASE } from '@/components/campus/ArbolEstructura'
import { requireRole, fechaAR } from '@/lib/auth'
import { etiquetaEdicion, hoyAR } from '@/lib/fechas'
import { encuestasPendientes } from '@/lib/encuestas'
import { PageHead, Empty, EstadoBadge } from '@/components/campus/ui'
import SpotlightCard from '@/components/ui/SpotlightCard'
import Reveal from '@/components/ui/Reveal'

type Insc = { id: string; edicion_id: string; estado: 'activo' | 'desertor' | 'finalizado'; motivo_desercion: string | null; fecha_desercion: string | null; n_clase_desercion: number | null; acceso_hasta: string | null; ediciones: { curso_id: string; fecha_inicio: string | null } | null }

export default async function AlumnoHome() {
  const { sb, perfil } = await requireRole('alumno')
  const { data: inscs } = await sb.from('inscripciones').select('id, edicion_id, estado, motivo_desercion, fecha_desercion, n_clase_desercion, acceso_hasta, ediciones(curso_id, fecha_inicio)').eq('alumno_id', perfil.id)
  const lista = (inscs ?? []) as unknown as Insc[]
  // Cada inscripción es a una EDICIÓN; el nombre sale del curso (catálogo público).
  const ids = [...new Set(lista.map((i) => i.ediciones?.curso_id).filter(Boolean))] as string[]
  const { data: cursos } = ids.length ? await sb.from('cursos_publicos').select('id, nombre').in('id', ids) : { data: [] }
  const nombre = (i: Insc) => cursos?.find((c) => c.id === i.ediciones?.curso_id)
  // RF-34/35: terminado el curso, el material sigue disponible hasta `acceso_hasta` (3 meses; lo calcula la base).
  const hoy = hoyAR()
  const conAcceso = (i: Insc) => i.estado === 'finalizado' && !!i.acceso_hasta && hoy <= i.acceso_hasta

  // RF-11 (🟡, configurable en site_settings.campus.entrada_directa; por defecto activo):
  // con un solo curso en curso se entra directo.
  const { data: cfg } = await sb.from('site_settings').select('valor').eq('clave', 'campus').maybeSingle()
  const flag = (cfg?.valor as { entrada_directa?: boolean | string } | null)?.entrada_directa
  const directa = !(flag === false || flag === 'false')
  if (directa && lista.length === 1 && lista[0].estado === 'activo') redirect(`/campus/alumno/curso/${lista[0].edicion_id}`)

  const proximas = await Promise.all(lista.filter((i) => i.estado === 'activo').map(async (i) => {
    const { data } = await sb.rpc('proxima_clase_titulo', { p_edicion: i.edicion_id })
    return { edicion_id: i.edicion_id, clase: (data as { numero: number; fecha: string; titulo: string; tipo: 'teorica' | 'practica' }[] | null)?.[0] }
  }))

  // Material ya liberado por edición (RLS + material_visible: nunca cuenta lo no liberado).
  const liberados = new Map<string, number>(await Promise.all(lista.filter((i) => i.estado === 'activo').map(async (i) => {
    const { data } = await sb.rpc('material_visible', { p_edicion: i.edicion_id })
    return [i.edicion_id, (data as unknown[] | null)?.length ?? 0] as [string, number]
  })))

  // RF-47: las encuestas tienen su pantalla; acá solo se avisa cuántas hay pendientes.
  const pendientes = await encuestasPendientes(sb, perfil.id)

  return (
    <>
      <PageHead title={`Hola, ${perfil.nombre}`} sub="Tus cursos y el material liberado." />

      {pendientes.length > 0 && (
        <Link href="/campus/alumno/encuestas" className="card mb-6 flex flex-wrap items-center gap-3 border-accent/40 p-4 text-sm transition-colors hover:border-secondary">
          <ClipboardList size={18} className="text-accent" />
          <span className="min-w-0 flex-1">Tenés <strong>{pendientes.length}</strong> encuesta{pendientes.length === 1 ? '' : 's'} para responder.</span>
          <span className="inline-flex items-center gap-1 font-semibold text-secondary">Ver encuestas <ArrowRight size={16} /></span>
        </Link>
      )}

      {lista.length === 0 && <Empty>Todavía no estás inscripto en ningún curso. Si ya te inscribiste, la academia te va a sumar en breve.</Empty>}

      <section className="grid gap-4 md:grid-cols-2">
        {lista.map((i, idx) => {
          const c = nombre(i)
          const prox = proximas.find((p) => p.edicion_id === i.edicion_id)?.clase
          return (
            <Reveal key={i.id} delay={idx * 0.07} className="h-full">
            <SpotlightCard className="h-full">
            <article className="flex h-full flex-col p-6">
              <span aria-hidden className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-accent/15 text-accent"><GraduationCap size={22} /></span>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold">{c?.nombre ?? 'Curso'} <span className="text-base font-normal capitalize text-on-surface-variant">· {etiquetaEdicion(i.ediciones?.fecha_inicio)}</span></h2>
                <EstadoBadge estado={i.estado} />
              </div>

              {i.estado === 'desertor' && (
                <div role="alert" className="mb-4 flex gap-3 rounded border border-red-500/40 bg-red-500/10 p-4 text-sm">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-300" />
                  <div>
                    <p className="font-semibold text-red-200">Fuiste dado de baja de este curso el {fechaAR(i.fecha_desercion)}{i.n_clase_desercion != null ? ` (clase ${i.n_clase_desercion})` : ''}.</p>
                    <p className="mt-1 text-on-surface-variant">Motivo: {i.motivo_desercion}</p>
                    <p className="mt-1 text-on-surface-variant">Ya no tenés acceso al material de este curso. Si querés retomarlo, consultá por las próximas fechas.</p>
                  </div>
                </div>
              )}

              {i.estado === 'activo' && prox && (
                <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-on-surface-variant"><CalendarDays size={16} /> <span className="whitespace-nowrap">Próxima clase:</span> <span className="font-semibold text-on-surface">{prox.titulo}</span> · {TIPO_CLASE[prox.tipo]} ({fechaAR(prox.fecha)})</p>
              )}

              {i.estado === 'activo' && (
                <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant"><FileText size={16} /> <span className="font-semibold text-on-surface">{liberados.get(i.edicion_id) ?? 0}</span> material{liberados.get(i.edicion_id) === 1 ? '' : 'es'} liberado{liberados.get(i.edicion_id) === 1 ? '' : 's'}</p>
              )}

              {i.estado === 'finalizado' && (conAcceso(i)
                ? <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant"><CalendarDays size={16} /> Tenés acceso al material hasta el <span className="font-semibold text-on-surface">{fechaAR(i.acceso_hasta)}</span>.</p>
                : <p className="mb-4 text-sm text-on-surface-variant">El acceso al material de este curso venció el {fechaAR(i.acceso_hasta)}.</p>)}

              <div className="mt-auto flex flex-wrap gap-3 pt-2">
                {(i.estado === 'activo' || conAcceso(i)) && <Link href={`/campus/alumno/curso/${i.edicion_id}`} className="btn-primary">Ver material <ArrowRight size={16} /></Link>}
                {conAcceso(i) && <a href={`/api/curso/${i.edicion_id}/zip`} className="btn-ghost"><Download size={16} /> Descargar todos los PDFs (ZIP)</a>}
              </div>
            </article>
            </SpotlightCard>
            </Reveal>
          )
        })}
      </section>

    </>
  )
}
