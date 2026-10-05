import { requireRole } from '@/lib/auth'
import ImageUploader from '@/components/campus/ImageUploader'
import { ActionForm, Confirm, Field, PageHead, Select, Check } from '@/components/campus/ui'
import { borrarItemCms, guardarItemCms, guardarSetting } from '../actions'

type S = Record<string, any>

function Setting({ clave, title, children }: { clave: string; title: string; children: React.ReactNode }) {
  return (
    <details className="card p-6"><summary className="cursor-pointer font-semibold">{title}</summary>
      <div className="mt-4 max-w-2xl"><ActionForm action={guardarSetting} reset={false}><input type="hidden" name="clave" value={clave} />{children}</ActionForm></div>
    </details>
  )
}

function Item({ tipo, row, children }: { tipo: string; row?: S; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <ActionForm action={guardarItemCms} reset={!row} submit={row ? 'Guardar' : 'Agregar'}>
        <input type="hidden" name="tipo" value={tipo} />{row && <input type="hidden" name="id" value={row.id} />}
        {children}
        <Field label="Orden" name="orden" type="number" defaultValue={row?.orden ?? 0} />
      </ActionForm>
      {row && <form action={borrarItemCms} className="mt-2"><input type="hidden" name="tipo" value={tipo} /><input type="hidden" name="id" value={row.id} /><Confirm message="¿Eliminar?">Eliminar</Confirm></form>}
    </div>
  )
}

const CATS: [string, string][] = [['aulas', 'Aulas'], ['clases', 'Clases en acción'], ['trabajos', 'Trabajos de alumnos'], ['egresados', 'Egresados'], ['eventos', 'Eventos']]
const AREAS: [string, string][] = [['diseno', 'Creación y Diseño'], ['tecnico', 'Reparación y Tecnología']]

export default async function Sitio() {
  const { sb } = await requireRole('admin')
  const [{ data: st }, { data: egr }, { data: tes }, { data: faq }, { data: gal }, { data: cursos }] = await Promise.all([
    sb.from('site_settings').select('clave, valor'),
    sb.from('cms_egresados').select('*').order('orden'),
    sb.from('cms_testimonios').select('*').order('orden'),
    sb.from('cms_faq').select('*').order('orden'),
    sb.from('cms_galeria').select('*').order('orden'),
    sb.from('cursos').select('id, nombre').eq('activo', true).order('nombre'),
  ])
  const v = (k: string): S => (st?.find((s) => s.clave === k)?.valor as S) ?? {}
  const h = v('hero'), c = v('contacto'), s = v('stats'), n = v('nosotros'), a = v('areas'), campus = v('campus')
  const h2 = 'mb-4 mt-12 text-2xl font-semibold'

  return (
    <>
      <PageHead title="Sitio web" sub="Todo el contenido público sale de acá. Solo el administrador puede modificarlo." />
      <div className="space-y-3">
        <Setting clave="hero" title="Portada (hero)">
          <Field label="Título" name="titulo" defaultValue={h.titulo} /><Field label="Subtítulo" name="subtitulo" rows={2} defaultValue={h.subtitulo} />
          <Field label="Imagen de fondo (URL)" name="imagen_url" defaultValue={h.imagen_url} />
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Texto botón cursos" name="cta_cursos" defaultValue={h.cta_cursos} /><Field label="Texto botón WhatsApp" name="cta_whatsapp" defaultValue={h.cta_whatsapp} /></div>
        </Setting>
        <Setting clave="areas" title="Las dos áreas">
          {AREAS.map(([k, l]) => <div key={k} className="space-y-3 border-b border-outline-variant pb-4"><p className="font-semibold">{l}</p>
            <Field label="Título" name={`${k}.titulo`} defaultValue={a[k]?.titulo} /><Field label="Texto" name={`${k}.texto`} rows={2} defaultValue={a[k]?.texto} /><Field label="Imagen (URL)" name={`${k}.imagen_url`} defaultValue={a[k]?.imagen_url} /></div>)}
        </Setting>
        <Setting clave="nosotros" title="Nosotros"><Field label="Título" name="titulo" defaultValue={n.titulo} /><Field label="Texto" name="texto" rows={5} defaultValue={n.texto} /></Setting>
        <Setting clave="stats" title="Números (stats)">
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Aulas" name="aulas" type="number" defaultValue={s.aulas} /><Field label="Profesores" name="profesores" type="number" defaultValue={s.profesores} /><Field label="Egresados" name="egresados" type="number" defaultValue={s.egresados} /></div>
        </Setting>
        <Setting clave="contacto" title="Datos de contacto y redes">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dirección" name="direccion" defaultValue={c.direccion} /><Field label="Horario de atención" name="horario" defaultValue={c.horario} />
            <Field label="Teléfono" name="telefono" defaultValue={c.telefono} /><Field label="Email" name="email" type="email" defaultValue={c.email} />
            <Field label="WhatsApp (solo números, con código de país)" name="whatsapp" defaultValue={c.whatsapp} placeholder="549351…" /><Field label="Instagram" name="instagram" defaultValue={c.instagram} placeholder="@usuario" />
          </div>
        </Setting>
        <Setting clave="campus" title="Campus del alumno: entrada directa">
          <p className="text-sm text-on-surface-variant">Con un solo curso activo, el alumno entra directo a ese curso. Escribí «false» para mostrar siempre «Mis cursos».</p>
          <Field label="Entrada directa" name="entrada_directa" defaultValue={String(campus.entrada_directa ?? true)} />
        </Setting>
      </div>

      <h2 className={h2}>Imágenes</h2>
      <div className="max-w-xl"><ImageUploader /></div>

      <h2 className={h2}>Egresados</h2>
      <p className="mb-4 text-sm text-on-surface-variant">Los «destacados» ocupan 2×2 en la grilla. Se necesita consentimiento de uso de imagen.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {egr?.map((r) => <Item key={r.id} tipo="egresado" row={r}><Field label="Nombre" name="nombre" defaultValue={r.nombre} required /><Field label="Especialidad" name="especialidad" defaultValue={r.especialidad} required /><Field label="Foto (URL)" name="foto_url" defaultValue={r.foto_url} /><Check name="destacado" defaultChecked={r.destacado}>Destacado</Check></Item>)}
        <Item tipo="egresado"><p className="font-semibold">Nuevo egresado</p><Field label="Nombre" name="nombre" required /><Field label="Especialidad" name="especialidad" required /><Field label="Foto (URL)" name="foto_url" /><Check name="destacado">Destacado</Check></Item>
      </div>

      <h2 className={h2}>Testimonios</h2>
      <p className="mb-4 text-sm text-on-surface-variant">Sin curso = aparece en el inicio. Con curso = aparece en la ficha de ese curso.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {[...(tes ?? []), null].map((r) => (
          <Item key={r?.id ?? 'nuevo'} tipo="testimonio" row={r ?? undefined}>
            {!r && <p className="font-semibold">Nuevo testimonio</p>}
            <Field label="Nombre" name="nombre" defaultValue={r?.nombre} required /><Field label="Curso (texto)" name="curso" defaultValue={r?.curso} />
            <Field label="Texto" name="texto" rows={3} defaultValue={r?.texto} required /><Field label="Puntaje (1–5)" name="puntaje" type="number" defaultValue={r?.puntaje ?? 5} />
            <Field label="Foto (URL)" name="foto_url" defaultValue={r?.foto_url} />
            <Select name="curso_id" label="Mostrar en la ficha de" defaultValue={r?.curso_id} empty="Solo en el inicio" options={(cursos ?? []).map((x) => [x.id, x.nombre])} />
          </Item>
        ))}
      </div>

      <h2 className={h2}>Preguntas frecuentes</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {[...(faq ?? []), null].map((r) => <Item key={r?.id ?? 'nuevo'} tipo="faq" row={r ?? undefined}>{!r && <p className="font-semibold">Nueva pregunta</p>}<Field label="Pregunta" name="pregunta" defaultValue={r?.pregunta} required /><Field label="Respuesta" name="respuesta" rows={3} defaultValue={r?.respuesta} required /></Item>)}
      </div>

      <h2 className={h2}>Galería de fotos</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {[...(gal ?? []), null].map((r) => (
          <Item key={r?.id ?? 'nuevo'} tipo="foto" row={r ?? undefined}>
            {!r && <p className="font-semibold">Nueva foto</p>}
            <Field label="Imagen (URL)" name="imagen_url" defaultValue={r?.imagen_url} required /><Field label="Texto alternativo (accesibilidad)" name="alt" defaultValue={r?.alt} required />
            <Field label="Descripción corta" name="descripcion" defaultValue={r?.descripcion} />
            <div className="grid gap-4 sm:grid-cols-2"><Select name="categoria" label="Categoría" defaultValue={r?.categoria ?? 'aulas'} options={CATS} /><Select name="area" label="Área" defaultValue={r?.area} empty="—" options={AREAS} /></div>
          </Item>
        ))}
      </div>
    </>
  )
}
