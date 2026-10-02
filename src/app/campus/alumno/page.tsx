import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, CalendarDays, Download, ClipboardList, ArrowRight, FileText, GraduationCap } from 'lucide-react'
import { requireRole, fechaAR } from '@/lib/auth'
import { PageHead, Empty, Badge } from '@/components/campus/ui'
import SpotlightCard from '@/components/ui/SpotlightCard'
import Reveal from '@/components/ui/Reveal'

type Insc = { id: string; curso_id: string; estado: 'activo' | 'desertor' | 'finalizado'; motivo_desercion: string | null; fecha_desercion: string | null; n_clase_desercion: number | null }

export default async function AlumnoHome() {
  const { sb, perfil } = await requireRole('alumno')
  const { data: inscs } = await sb.from('inscripciones').select('id, curso_id, estado, motivo_desercion, fecha_desercion, n_clase_desercion').eq('alumno_id', perfil.id)
  const lista = (inscs ?? []) as Insc[]
  const ids = lista.map((i) => i.curso_id)
  const { data: cursos } = ids.length ? await sb.from('cursos_publicos').select('id, nombre, aula, cupo').in('id', ids) : { data: [] }
  const nombre = (id: string) => cursos?.find((c) => c.id === id)

  // RF-11 (🟡, configurable en site_settings.campus.entrada_directa; por defecto activo):
  // con un solo curso en curso se entra directo.
  const { data: cfg } = await sb.from('site_settings').select('valor').eq('clave', 'campus').maybeSingle()
  const flag = (cfg?.valor as { entrada_directa?: boolean | string } | null)?.entrada_directa
  const directa = !(flag === false || flag === 'false')
  if (directa && lista.length === 1 && lista[0].estado === 'activo') redirect(`/campus/alumno/curso/${lista[0].curso_id}`)

  const proximas = await Promise.all(lista.filter((i) => i.estado === 'activo').map(async (i) => {
    const { data } = await sb.rpc('proxima_clase_titulo', { p_curso: i.curso_id })
    return { curso_id: i.curso_id, clase: (data as { numero: number; fecha: string; titulo: string }[] | null)?.[0] }
  }))

  // Material ya liberado por curso (RLS + material_visible: nunca cuenta lo no liberado).
  const liberados = new Map<string, number>(await Promise.all(lista.filter((i) => i.estado === 'activo').map(async (i) => {
    const { data } = await sb.rpc('material_visible', { p_curso: i.curso_id })
    return [i.curso_id, (data as unknown[] | null)?.length ?? 0] as [string, number]
  })))

  const { data: encuestas } = await sb.from('encuestas').select('id, titulo, curso_id').eq('activa', true)
  const { data: hechas } = await sb.from('encuesta_completadas').select('encuesta_id').eq('alumno_id', perfil.id)
  const pendientes = (encuestas ?? []).filter((e) => !hechas?.some((h) => h.encuesta_id === e.id))

  return (
    <>
      <PageHead title={`Hola, ${perfil.nombre}`} sub="Tus cursos y el material liberado." />

      {lista.length === 0 && <Empty>Todavía no estás inscripto en ningún curso. Si ya te inscribiste, la academia te va a sumar en breve.</Empty>}

      <section className="grid gap-4 md:grid-cols-2">
        {lista.map((i, idx) => {
          const c = nombre(i.curso_id)
          const prox = proximas.find((p) => p.curso_id === i.curso_id)?.clase
          return (
            <Reveal key={i.id} delay={idx * 0.07} className="h-full">
            <SpotlightCard className="h-full">
            <article className="flex h-full flex-col p-6">
              <span aria-hidden className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-accent/15 text-accent"><GraduationCap size={22} /></span>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold">{c?.nombre ?? 'Curso'}</h2>
                <Badge tone={i.estado === 'activo' ? 'ok' : i.estado === 'desertor' ? 'bad' : 'neutral'}>{i.estado === 'finalizado' ? 'Finalizado' : i.estado === 'desertor' ? 'Desertor' : 'Activo'}</Badge>
              </div>

              {i.estado === 'desertor' && (
                <div role="alert" className="mb-4 flex gap-3 rounded border border-red-500/40 bg-red-500/10 p-4 text-sm">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-300" />
                  <div>
                    <p className="font-semibold text-red-200">Fuiste dado de baja de este curso el {fechaAR(i.fecha_desercion)}{i.n_clase_desercion != null ? ` (clase ${i.n_clase_desercion})` : ''}.</p>
                    <p className="mt-1 text-on-surface-variant">Motivo: {i.motivo_desercion}</p>
                    <p className="mt-1 text-on-surface-variant">Ya no tenés acceso al material de este curso.</p>
                  </div>
                </div>
              )}

              {i.estado === 'activo' && prox && (
                <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-on-surface-variant"><CalendarDays size={16} /> <span className="whitespace-nowrap">Próxima clase:</span> <span className="font-semibold text-on-surface">#{prox.numero} · {prox.titulo}</span> ({fechaAR(prox.fecha)})</p>
              )}

              {i.estado === 'activo' && (
                <p className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant"><FileText size={16} /> <span className="font-semibold text-on-surface">{liberados.get(i.curso_id) ?? 0}</span> material{liberados.get(i.curso_id) === 1 ? '' : 'es'} liberado{liberados.get(i.curso_id) === 1 ? '' : 's'}</p>
              )}

              <div className="mt-auto flex flex-wrap gap-3 pt-2">
                {i.estado === 'activo' && <Link href={`/campus/alumno/curso/${i.curso_id}`} className="btn-primary">Ver material <ArrowRight size={16} /></Link>}
                {i.estado === 'finalizado' && <a href={`/api/curso/${i.curso_id}/zip`} className="btn-primary"><Download size={16} /> Descargar todos los PDFs (ZIP)</a>}
              </div>
            </article>
            </SpotlightCard>
            </Reveal>
          )
        })}
      </section>

      {pendientes.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Encuestas pendientes</h2>
          <ul className="space-y-2">
            {pendientes.map((e) => (
              <li key={e.id}><Link href={`/campus/alumno/encuesta/${e.id}`} className="card flex items-center justify-between p-4 transition-colors hover:border-secondary"><span className="flex items-center gap-2"><ClipboardList size={18} /> {e.titulo}</span><ArrowRight size={16} /></Link></li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
