import { MediaField } from '@/components/campus/MediaField'
import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import ImageUploader from '@/components/campus/ImageUploader'
import { ActionForm, Confirm, Field, PageHead, Select, Check } from '@/components/campus/ui'
import { borrarItemCms, guardarItemCms, guardarSetting } from '../actions'

type S = Record<string, any>

function Setting({ clave, title, hint, children }: { clave: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="mb-4 mt-1 text-sm text-on-surface-variant">{hint}</p>}
      <div className="mt-4 max-w-2xl"><ActionForm action={guardarSetting} reset={false}><input type="hidden" name="clave" value={clave} />{children}</ActionForm></div>
    </section>
  )
}

function Item({ tipo, row, children }: { tipo: string; row?: S; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <ActionForm action={guardarItemCms} reset={!row} submit={row ? 'Guardar' : 'Agregar'}>
        <input type="hidden" name="tipo" value={tipo} />{row && <input type="hidden" name="id" value={row.id} />}
        {children}
        <Field label="Orden" name="orden" placeholder="Ej: 1" type="number" defaultValue={row?.orden ?? 0} />
      </ActionForm>
      {row && <form action={borrarItemCms} className="mt-2"><input type="hidden" name="tipo" value={tipo} /><input type="hidden" name="id" value={row.id} /><Confirm message="¿Eliminar?">Eliminar</Confirm></form>}
    </div>
  )
}

const CATS: [string, string][] = [['aulas', 'Aulas'], ['clases', 'Clases en acción'], ['trabajos', 'Trabajos de alumnos'], ['egresados', 'Egresados'], ['eventos', 'Eventos']]
const AREAS: [string, string][] = [['diseno', 'Creación y Diseño'], ['tecnico', 'Reparación y Tecnología']]

export default async function Sitio({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { sb } = await requireRole('admin')
  const { tab } = await searchParams
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

  const tabs: [string, string, string, string][] = [
    ['inicio', 'Inicio', 'Portada, áreas, «Nosotros» y números', '/'],
    ['contacto', 'Contacto', 'Dirección, horarios, mail, WhatsApp e Instagram', '/contacto'],
    ['egresados', `Egresados (${egr?.length ?? 0})`, 'Mosaico de egresados del inicio', '/'],
    ['testimonios', `Testimonios (${tes?.length ?? 0})`, 'Opiniones del inicio y de la ficha de cada curso', '/'],
    ['faq', `Preguntas (${faq?.length ?? 0})`, 'Preguntas frecuentes', '/preguntas-frecuentes'],
    ['galeria', `Galería (${gal?.length ?? 0})`, 'Fotos de aulas, clases, trabajos y eventos', '/galeria'],
    ['imagenes', 'Imágenes', 'Subir una imagen y copiar su link', '/'],
    ['campus', 'Campus', 'Cómo entra el alumno al campus', '/login'],
  ]
  const actual = tabs.find(([k]) => k === tab) ?? tabs[0]

  return (
    <>
      <PageHead title="Sitio web" sub="Todo el contenido público sale de acá. Solo el administrador puede modificarlo." />
      <nav aria-label="Secciones del sitio" className="mb-4 flex flex-wrap gap-2 border-b border-outline-variant pb-3">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/campus/admin/sitio?tab=${k}`} scroll={false} aria-current={actual[0] === k ? 'page' : undefined}
            className={`rounded px-4 py-2 text-sm font-semibold transition-colors ${actual[0] === k ? 'bg-accent text-surface' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-secondary'}`}>{l}</Link>
        ))}
      </nav>
      <p className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-surface-variant">
        <span>Estás editando: <b className="text-on-surface">{actual[1].replace(/ \(\d+\)$/, '')}</b> — {actual[2]}.</span>
        <Link href={actual[3]} target="_blank" className="font-semibold text-secondary hover:underline">Ver en el sitio ↗</Link>
      </p>

      {actual[0] === 'inicio' && (
        <div className="space-y-6">
        <Setting clave="hero" title="Portada" hint="Lo primero que se ve al entrar al sitio: título, subtítulo, imagen de fondo y botones.">
          <Field label="Título" name="titulo" placeholder="Ej: Aprendé un oficio con salida laboral" defaultValue={h.titulo} /><Field label="Subtítulo" name="subtitulo" placeholder="Ej: Aprendé un oficio con salida laboral" rows={2} defaultValue={h.subtitulo} />
          <MediaField tipo="imagen" label="Imagen de fondo" name="imagen_url" defaultValue={h.imagen_url} />
          <MediaField tipo="video" label="Video de fondo (opcional)" name="video_url" defaultValue={h.video_url} hint="Se reproduce en la portada, sin sonido y en bucle. Hasta 60 s; se comprime solo a 720p." />
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Texto botón cursos" name="cta_cursos" placeholder="Ej: Ver cursos" defaultValue={h.cta_cursos} /><Field label="Texto botón WhatsApp" name="cta_whatsapp" placeholder="Ej: Consultar por WhatsApp" defaultValue={h.cta_whatsapp} /></div>
        </Setting>
        <Setting clave="areas" title="Las dos áreas" hint="Las dos tarjetas grandes del inicio que llevan al catálogo de cada área.">
          {AREAS.map(([k, l]) => <div key={k} className="space-y-3 border-b border-outline-variant pb-4"><p className="font-semibold">{l}</p>
            <Field label="Título" name={`${k}.titulo`} defaultValue={a[k]?.titulo} /><Field label="Texto" name={`${k}.texto`} rows={2} defaultValue={a[k]?.texto} /><Field label="Imagen (URL)" name={`${k}.imagen_url`} defaultValue={a[k]?.imagen_url} /></div>)}
        </Setting>
        <Setting clave="nosotros" title="Nosotros" hint="Texto de presentación de la academia en el inicio."><Field label="Título" name="titulo" placeholder="Ej: Aprendé un oficio con salida laboral" defaultValue={n.titulo} /><Field label="Texto" name="texto" placeholder="Escribí el texto acá…" rows={5} defaultValue={n.texto} /></Setting>
        <Setting clave="stats" title="Números" hint="Los tres números destacados de «Nosotros» (aulas, profesores y egresados).">
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Aulas" name="aulas" placeholder="Ej: 3" type="number" defaultValue={s.aulas} /><Field label="Profesores" name="profesores" placeholder="Ej: 8" type="number" defaultValue={s.profesores} /><Field label="Egresados" name="egresados" placeholder="Ej: 250" type="number" defaultValue={s.egresados} /></div>
        </Setting>
        </div>
      )}
      {actual[0] === 'contacto' && (
        <div className="space-y-6">
        <Setting clave="contacto" title="Datos de contacto y redes" hint="Aparecen en la página de Contacto y en el pie de todo el sitio. El WhatsApp es solo un enlace al chat.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dirección" name="direccion" placeholder="Calle y número, ciudad" defaultValue={c.direccion} /><Field label="Horario de atención" name="horario" placeholder="Ej: Lunes a viernes de 9 a 18 h" defaultValue={c.horario} />
            <Field label="Teléfono" name="telefono" placeholder="Ej: 351 123 4567" defaultValue={c.telefono} /><Field label="Email" name="email" placeholder="nombre@ejemplo.com" type="email" defaultValue={c.email} />
            <Field label="WhatsApp (solo números, con código de país)" name="whatsapp" defaultValue={c.whatsapp} placeholder="549351…" /><Field label="Instagram" name="instagram" defaultValue={c.instagram} placeholder="@usuario" />
          </div>
        </Setting>
        </div>
      )}
      {actual[0] === 'campus' && (
        <div className="space-y-6">
        <Setting clave="campus" title="Entrada directa al campus" hint="Cómo entra el alumno al campus.">
          <p className="text-sm text-on-surface-variant">Con un solo curso activo, el alumno entra directo a ese curso. Escribí «false» para mostrar siempre «Mis cursos».</p>
          <Field label="Entrada directa" name="entrada_directa" defaultValue={String(campus.entrada_directa ?? true)} />
        </Setting>
        </div>
      )}
      {actual[0] === 'imagenes' && (
        <div className="space-y-4">
      <div className="max-w-xl"><ImageUploader /></div>
        </div>
      )}
      {actual[0] === 'egresados' && (
        <div>
      <p className="mb-4 text-sm text-on-surface-variant">Los «destacados» ocupan 2×2 en la grilla. Se necesita consentimiento de uso de imagen.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {egr?.map((r) => <Item key={r.id} tipo="egresado" row={r}><Field label="Nombre" name="nombre" placeholder="Ej: María" defaultValue={r.nombre} required /><Field label="Especialidad" name="especialidad" placeholder="Ej: Reparación de celulares" defaultValue={r.especialidad} required /><Field label="Foto (URL)" name="foto_url" placeholder="https://…/foto.jpg" defaultValue={r.foto_url} /><Check name="destacado" defaultChecked={r.destacado}>Destacado</Check></Item>)}
        <Item tipo="egresado"><p className="font-semibold">Nuevo egresado</p><Field label="Nombre" name="nombre" placeholder="Ej: María" required /><Field label="Especialidad" name="especialidad" placeholder="Ej: Reparación de celulares" required /><Field label="Foto (URL)" name="foto_url" placeholder="https://…/foto.jpg" /><Check name="destacado">Destacado</Check></Item>
      </div>
        </div>
      )}
      {actual[0] === 'testimonios' && (
        <div>
      <p className="mb-4 text-sm text-on-surface-variant">Sin curso = aparece en el inicio. Con curso = aparece en la ficha de ese curso.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {[...(tes ?? []), null].map((r) => (
          <Item key={r?.id ?? 'nuevo'} tipo="testimonio" row={r ?? undefined}>
            {!r && <p className="font-semibold">Nuevo testimonio</p>}
            <Field label="Nombre" name="nombre" placeholder="Ej: María" defaultValue={r?.nombre} required /><Field label="Curso (texto)" name="curso" placeholder="Ej: Reparación de celulares" defaultValue={r?.curso} />
            <Field label="Texto" name="texto" placeholder="Escribí el texto acá…" rows={3} defaultValue={r?.texto} required /><Field label="Puntaje (1–5)" name="puntaje" placeholder="1 a 5" type="number" defaultValue={r?.puntaje ?? 5} />
            <Field label="Foto (URL)" name="foto_url" placeholder="https://…/foto.jpg" defaultValue={r?.foto_url} />
            <Select name="curso_id" label="Mostrar en la ficha de" defaultValue={r?.curso_id} empty="Solo en el inicio" options={(cursos ?? []).map((x) => [x.id, x.nombre])} />
          </Item>
        ))}
      </div>
        </div>
      )}
      {actual[0] === 'faq' && (
        <div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...(faq ?? []), null].map((r) => <Item key={r?.id ?? 'nuevo'} tipo="faq" row={r ?? undefined}>{!r && <p className="font-semibold">Nueva pregunta</p>}<Field label="Pregunta" name="pregunta" placeholder="Ej: ¿Cómo me inscribo?" defaultValue={r?.pregunta} required /><Field label="Respuesta" name="respuesta" placeholder="Escribí la respuesta…" rows={3} defaultValue={r?.respuesta} required /></Item>)}
      </div>
        </div>
      )}
      {actual[0] === 'galeria' && (
        <div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...(gal ?? []), null].map((r) => (
          <Item key={r?.id ?? 'nuevo'} tipo="foto" row={r ?? undefined}>
            {!r && <p className="font-semibold">Nueva foto</p>}
            <MediaField tipo="imagen" label="Imagen" name="imagen_url" defaultValue={r?.imagen_url} /><Field label="Texto alternativo (accesibilidad)" name="alt" placeholder="Ej: Alumnos trabajando en el taller" defaultValue={r?.alt} required />
            <Field label="Descripción corta" name="descripcion" placeholder="Contá qué se aprende y para quién…" defaultValue={r?.descripcion} />
            <div className="grid gap-4 sm:grid-cols-2"><Select name="categoria" label="Categoría" defaultValue={r?.categoria ?? 'aulas'} options={CATS} /><Select name="area" label="Área" defaultValue={r?.area} empty="—" options={AREAS} /></div>
          </Item>
        ))}
      </div>
        </div>
      )}
    </>
  )
}
