import { ArrowUpRight, ChevronDown, Pencil, Plus, ChevronRight, DoorOpen, FileText, GraduationCap, HelpCircle, Home, Image as ImageIcon, LayoutList, Mail, MessageSquareQuote, Search } from 'lucide-react'
import { TEXTOS_BASE, type TextosGuardados } from '@/lib/textos'
import { MediaField } from '@/components/campus/MediaField'
import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import ImageUploader from '@/components/campus/ImageUploader'
import { ActionForm, Badge, Confirm, Field, ModalButton, PageHead, Select, Check, Pestanas } from '@/components/campus/ui'
import { borrarItemCms, guardarFichaAula, guardarItemCms, guardarSetting } from '../actions'
import { DestacadosEditor, FotosEditor } from '@/components/campus/ListEditors'

type S = Record<string, any>

// Un bloque editable del sitio. Plegable: en una pestaña con varios bloques (Inicio) se abre uno por vez y se ve de
// un vistazo qué se puede editar, en vez de cuatro formularios largos apilados.
function Setting({ clave, title, hint, abierto = true, children }: { clave: string; title: string; hint?: string; abierto?: boolean; children: React.ReactNode }) {
  return (
    <details open={abierto} className="card group">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-lg font-semibold">{title}</span>
          {hint && <span className="mt-1 block text-sm text-on-surface-variant">{hint}</span>}
        </span>
        <ChevronDown size={20} aria-hidden className="mt-1 shrink-0 text-on-surface-variant transition-transform group-open:rotate-180" />
      </summary>
      <div className="max-w-2xl px-6 pb-6"><ActionForm action={guardarSetting} reset={false}><input type="hidden" name="clave" value={clave} />{children}</ActionForm></div>
    </details>
  )
}

// Elemento de una lista del CMS (egresado, testimonio, pregunta): una fila compacta con su resumen y «Editar» en un
// modal, en vez de un formulario abierto por cada uno (con 9 testimonios la página medía varios metros).
function Item({ tipo, nombre, row, resumen, detalle, children }: { tipo: string; nombre: string; row: S; resumen: React.ReactNode; detalle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{resumen}</p>
        {detalle && <p className="line-clamp-1 text-sm text-on-surface-variant">{detalle}</p>}
      </div>
      <span className="shrink-0 text-xs tabular-nums text-on-surface-variant">Orden {row.orden ?? 0}</span>
      <ModalButton label={<><Pencil size={14} aria-hidden /> Editar</>} title={`Editar ${nombre}`} wide>
        <ActionForm action={guardarItemCms} reset={false} submit="Guardar">
          <input type="hidden" name="tipo" value={tipo} /><input type="hidden" name="id" value={row.id} />
          {children}
          <Field label="Orden" name="orden" placeholder="Ej: 1" type="number" defaultValue={row.orden ?? 0} hint="Los números más bajos van primero." />
        </ActionForm>
      </ModalButton>
      <ActionForm action={borrarItemCms} submit={null} reset={false} okLabel="Hecho" className="inline"><input type="hidden" name="tipo" value={tipo} /><input type="hidden" name="id" value={row.id} /><Confirm message="¿Eliminar? No se puede deshacer.">Eliminar</Confirm></ActionForm>
    </li>
  )
}

// Encabezado de una lista del CMS con el botón «Agregar» (abre el mismo formulario vacío en un modal).
function Lista({ tipo, nombre, nota, vacio, nuevo, children }: { tipo: string; nombre: string; nota?: React.ReactNode; vacio: string; nuevo: React.ReactNode; children: React.ReactNode[] }) {
  return (
    <section className="card p-5 md:p-6">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        {nota ? <p className="max-w-2xl text-sm text-on-surface-variant">{nota}</p> : <span />}
        <ModalButton label={<><Plus size={16} aria-hidden /> Agregar {nombre}</>} title={`Agregar ${nombre}`} className="btn-primary" wide>
          <ActionForm action={guardarItemCms} submit="Agregar">
            <input type="hidden" name="tipo" value={tipo} />
            {nuevo}
            <Field label="Orden" name="orden" placeholder="Ej: 1" type="number" defaultValue={0} hint="Los números más bajos van primero." />
          </ActionForm>
        </ModalButton>
      </div>
      {children.length ? <ul className="divide-y divide-outline-variant">{children}</ul> : <p className="py-6 text-sm text-on-surface-variant">{vacio}</p>}
    </section>
  )
}

const AREAS: [string, string][] = [['diseno', 'Creación y Diseño'], ['tecnico', 'Reparación y Tecnología']]

export default async function Sitio({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { sb } = await requireRole('admin')
  const { tab } = await searchParams
  const [{ data: st }, { data: egr }, { data: tes }, { data: faq }, { data: cursos }, { data: aulas }, { data: fichas }, { data: dest }, { data: fotos }] = await Promise.all([
    sb.from('site_settings').select('clave, valor'),
    sb.from('cms_egresados').select('*').order('orden'),
    sb.from('cms_testimonios').select('*').order('orden'),
    sb.from('cms_faq').select('*').order('orden'),
    sb.from('cursos').select('id, nombre').eq('activo', true).order('nombre'),
    // RF-60: aulas activas y su ficha pública (las dadas de baja no se muestran en el sitio).
    sb.from('aulas').select('id, nombre').eq('activa', true).order('nombre'),
    sb.from('cms_aulas').select('aula_id, descripcion, visible, orden, video_url'),
    sb.from('cms_aula_destacados').select('aula_id, tipo, texto').order('orden'),
    sb.from('cms_aula_fotos').select('aula_id, imagen_url, alt').order('orden'),
  ])
  const v = (k: string): S => (st?.find((s) => s.clave === k)?.valor as S) ?? {}
  const h = v('hero'), c = v('contacto'), s = v('stats'), n = v('nosotros'), a = v('areas'), campus = v('campus')
  const tx = v('textos') as TextosGuardados
  type Ficha = { aula_id: string; descripcion: string | null; visible: boolean; orden: number; video_url: string | null }
  const ficha = (id: string) => ((fichas ?? []) as Ficha[]).find((f) => f.aula_id === id)
  const aulasActivas = ((aulas ?? []) as { id: string; nombre: string }[])
    .sort((x, y) => (ficha(x.id)?.orden ?? 9999) - (ficha(y.id)?.orden ?? 9999) || x.nombre.localeCompare(y.nombre))
  const visibles = aulasActivas.filter((x) => ficha(x.id)?.visible).length
  const presentacion = v('aulas')

  // Una sección por página del sitio (como se recorre el sitio público). Sin `?tab=` se ve el índice.
  const tabs: [string, string, string, string, typeof Home][] = [
    ['inicio', 'Inicio', 'Portada, las dos áreas, títulos de cada sección, «Nosotros» y números', '/', Home],
    ['cursos', 'Cursos', 'Título y texto del catálogo de cursos y talleres', '/cursos', LayoutList],
    ['aulas', `Aulas (${visibles})`, 'Título, video general y ficha de cada aula (el número son las visibles en el sitio)', '/aulas', DoorOpen],
    ['faq', `Preguntas (${faq?.length ?? 0})`, 'Encabezado de la página y las preguntas frecuentes', '/preguntas-frecuentes', HelpCircle],
    ['contacto', 'Contacto', 'Textos de la página, dirección, horarios, mail, WhatsApp e Instagram', '/contacto', Mail],
    ['egresados', `Egresados (${egr?.length ?? 0})`, 'Fotos de los grupos que se recibieron', '/', GraduationCap],
    ['testimonios', `Testimonios (${tes?.length ?? 0})`, 'Opiniones del inicio y de la ficha de cada curso', '/', MessageSquareQuote],
    ['pie', 'Pie y buscadores', 'Texto del pie de página y cómo aparece el sitio en Google', '/', Search],
    ['campus', 'Campus', 'Cómo entra el alumno al campus', '/login', FileText],
    ['imagenes', 'Imágenes', 'Subir una imagen suelta y copiar su link', '/', ImageIcon],
  ]
  const actual = tabs.find(([k]) => k === tab)
  const opcionesCursos = (cursos ?? []).map((x) => [x.id, x.nombre] as [string, string])
  const nombreCurso = (id: string) => cursos?.find((x) => x.id === id)?.nombre ?? 'un curso dado de baja'
  // Campo de texto con el valor por defecto como ejemplo: vacío = se usa el de siempre.
  const texto = <P extends keyof typeof TEXTOS_BASE>(pagina: P, campo: keyof (typeof TEXTOS_BASE)[P] & string, label: string, rows?: number) => (
    <Field label={label} name={`${pagina}.${campo}`} rows={rows} placeholder={String(TEXTOS_BASE[pagina][campo])} defaultValue={(tx[pagina] as Record<string, string> | undefined)?.[campo]} />
  )
  const ayudaTextos = <p className="text-sm text-on-surface-variant">Si dejás un campo vacío se usa el texto que ves de ejemplo.</p>

  if (!actual) return (
    <>
      <PageHead title="Sitio web" sub="Todo el contenido público sale de acá. Elegí qué parte del sitio querés editar; los cambios se publican al guardar." />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tabs.map(([k, l, d, , Icon]) => (
          <li key={k}>
            <Link href={`/campus/admin/sitio?tab=${k}`} className="card group flex h-full items-start gap-4 p-5 transition-colors hover:border-outline">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-container-high text-secondary"><Icon size={18} /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold">{l}</span><span className="mt-1 block text-sm text-on-surface-variant">{d}</span></span>
              <ChevronRight size={18} aria-hidden className="mt-1 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )

  return (
    <>
      <PageHead title="Sitio web" sub="Todo el contenido público sale de acá. Solo el administrador puede modificarlo." />
      <Pestanas label="Secciones del sitio" items={tabs.map(([k, l]) => [k, l])} actual={actual[0]} href={(k) => `/campus/admin/sitio?tab=${k}`} />
      <p className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-surface-variant">
        <Link href="/campus/admin/sitio" className="-my-2.5 inline-block py-2.5 font-semibold text-secondary hover:underline">Todas las secciones</Link>
        <span aria-hidden>·</span>
        <span>{actual[2]}.</span>
        <Link href={actual[3]} target="_blank" className="-my-2.5 inline-flex items-center gap-1 py-2.5 font-semibold text-secondary hover:underline">Ver en el sitio <ArrowUpRight size={14} aria-hidden /></Link>
      </p>

      {actual[0] === 'inicio' && (
        <div className="space-y-6">
        <Setting clave="hero" title="Portada" hint="Lo primero que se ve al entrar al sitio: título, subtítulo, imagen de fondo y botones.">
          <Field label="Título" name="titulo" placeholder="Ej: Aprendé un oficio con salida laboral" defaultValue={h.titulo} /><Field label="Subtítulo" name="subtitulo" placeholder="Ej: Cursos y talleres presenciales en Córdoba" rows={2} defaultValue={h.subtitulo} />
          <MediaField tipo="imagen" label="Imagen de fondo" name="imagen_url" defaultValue={h.imagen_url} />
          <MediaField tipo="video" label="Video de fondo (opcional)" name="video_url" defaultValue={h.video_url} hint="Se reproduce en la portada, sin sonido y en bucle. Hasta 60 s; se comprime solo a 720p." />
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Texto botón cursos" name="cta_cursos" placeholder="Ej: Ver cursos" defaultValue={h.cta_cursos} /><Field label="Texto botón WhatsApp" name="cta_whatsapp" placeholder="Ej: Consultar por WhatsApp" defaultValue={h.cta_whatsapp} /></div>
        </Setting>
        <Setting clave="areas" abierto={false} title="Las dos áreas" hint="Las dos tarjetas grandes del inicio que llevan al catálogo de cada área.">
          {AREAS.map(([k, l]) => <div key={k} className="space-y-3 border-b border-outline-variant pb-4"><p className="font-semibold">{l}</p>
            <Field label="Título" name={`${k}.titulo`} defaultValue={a[k]?.titulo} /><Field label="Texto" name={`${k}.texto`} rows={2} defaultValue={a[k]?.texto} /><MediaField tipo="imagen" label="Imagen" name={`${k}.imagen_url`} defaultValue={a[k]?.imagen_url} /></div>)}
        </Setting>
        <Setting clave="textos" abierto={false} title="Títulos de las secciones" hint="Los títulos y bajadas de Próximos inicios, Destacadas, Egresados, Testimonios y Preguntas del inicio.">
          {ayudaTextos}
          {texto('inicio', 'proximos_titulo', 'Próximos inicios: título')}{texto('inicio', 'proximos_bajada', 'Próximos inicios: bajada', 2)}
          {texto('inicio', 'destacados_titulo', 'Destacadas: título')}
          {texto('inicio', 'egresados_titulo', 'Egresados: título')}{texto('inicio', 'egresados_bajada', 'Egresados: bajada', 2)}
          {texto('inicio', 'testimonios_titulo', 'Testimonios: título')}{texto('inicio', 'faq_titulo', 'Preguntas: título')}
        </Setting>
        <Setting clave="nosotros" abierto={false} title="Nosotros" hint="Texto de presentación de la academia en el inicio."><Field label="Título" name="titulo" placeholder="Ej: Aprendé un oficio con salida laboral" defaultValue={n.titulo} /><Field label="Texto" name="texto" placeholder="Escribí el texto acá…" rows={5} defaultValue={n.texto} /></Setting>
        <Setting clave="stats" abierto={false} title="Números" hint="Los tres números destacados de «Nosotros» (aulas, profesores y egresados).">
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Aulas" name="aulas" placeholder="Ej: 3" type="number" defaultValue={s.aulas} /><Field label="Profesores" name="profesores" placeholder="Ej: 8" type="number" defaultValue={s.profesores} /><Field label="Egresados" name="egresados" placeholder="Ej: 250" type="number" defaultValue={s.egresados} /></div>
        </Setting>
        </div>
      )}
      {actual[0] === 'cursos' && (
        <div className="space-y-6">
        <Setting clave="textos" title="Encabezado del catálogo" hint="Lo primero que se ve en Cursos y talleres, arriba de los filtros.">
          {ayudaTextos}
          {texto('cursos', 'titulo', 'Título')}{texto('cursos', 'bajada', 'Texto', 3)}
          {texto('cursos', 'descripcion', 'Descripción para Google (hasta 160 caracteres)', 2)}
        </Setting>
        <p className="text-sm text-on-surface-variant">Los cursos, sus fotos, precios y fechas se editan en <Link href="/campus/admin/cursos" className="font-semibold text-secondary hover:underline">Campus › Cursos y talleres</Link>.</p>
        </div>
      )}
      {actual[0] === 'pie' && (
        <div className="space-y-6">
        <Setting clave="textos" title="Pie de página" hint="El texto debajo del logo, en el pie de todas las páginas. Los datos de contacto se editan en Contacto.">
          {texto('pie', 'descripcion', 'Texto del pie', 2)}
        </Setting>
        <Setting clave="textos" title="Buscadores y redes" hint="El título y la descripción del inicio en Google y al compartir el link en WhatsApp o redes.">
          {ayudaTextos}
          {texto('seo', 'titulo', 'Título (hasta 60 caracteres)')}{texto('seo', 'descripcion', 'Descripción (hasta 160 caracteres)', 2)}
        </Setting>
        </div>
      )}
      {actual[0] === 'contacto' && (
        <div className="space-y-6">
        <Setting clave="textos" abierto={false} title="Textos de la página" hint="Título, texto de presentación y títulos de cada bloque de Contacto.">
          {ayudaTextos}
          {texto('contacto', 'titulo', 'Título')}{texto('contacto', 'bajada', 'Texto', 2)}
          <div className="grid gap-4 sm:grid-cols-2">{texto('contacto', 'mapa_titulo', 'Título de la dirección')}{texto('contacto', 'form_titulo', 'Título del formulario')}</div>
          {texto('contacto', 'descripcion', 'Descripción para Google (hasta 160 caracteres)', 2)}
        </Setting>
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
          <p className="text-sm text-on-surface-variant">Con un solo curso activo, el alumno entra directo a ese curso. Desactivala para mostrar siempre «Mis cursos».</p>
          <Select name="entrada_directa" label="Entrada directa" defaultValue={String(campus.entrada_directa ?? true) === 'false' ? 'false' : 'true'} options={[['true', 'Activa'], ['false', 'Desactivada']]} />
        </Setting>
        </div>
      )}
      {actual[0] === 'imagenes' && (
        <div className="space-y-4">
      <div className="max-w-xl"><ImageUploader /></div>
        </div>
      )}
      {actual[0] === 'egresados' && (
        <Lista tipo="egresado" nombre="grupo" vacio="Todavía no hay fotos de grupos." nota="Una foto por grupo que terminó un curso o taller. En el inicio se ven las 6 primeras (las destacadas, primero). Se necesita el consentimiento de uso de imagen."
          nuevo={<><Field label="Curso o taller" name="curso" placeholder="Ej: Reparación de celulares" required /><Field label="Promoción (opcional)" name="promocion" placeholder="Ej: Marzo 2026" /><MediaField tipo="imagen" label="Foto del grupo" name="foto_url" /><Check name="destacado" >Destacada (se ve más grande en el inicio)</Check></>}>
          {(egr ?? []).map((r) => (
            <Item key={r.id} tipo="egresado" nombre="grupo" row={r} resumen={<>{r.curso}{r.destacado && <span className="ml-2"><Badge tone="warn">Destacada</Badge></span>}</>} detalle={r.promocion}>
              <Field label="Curso o taller" name="curso" placeholder="Ej: Reparación de celulares" defaultValue={r.curso} required /><Field label="Promoción (opcional)" name="promocion" placeholder="Ej: Marzo 2026" defaultValue={r.promocion ?? ''} /><MediaField tipo="imagen" label="Foto del grupo" name="foto_url" defaultValue={r.foto_url} /><Check name="destacado" defaultChecked={r.destacado}>Destacada (se ve más grande en el inicio)</Check>
            </Item>
          ))}
        </Lista>
      )}
      {actual[0] === 'testimonios' && (
        <Lista tipo="testimonio" nombre="testimonio" vacio="Todavía no hay testimonios." nota="Sin curso elegido aparece en el inicio; con curso, en la ficha de ese curso."
          nuevo={<><Field label="Nombre" name="nombre" placeholder="Ej: María" required /><Field label="Curso (texto)" name="curso" placeholder="Ej: Reparación de celulares" />
                <Field label="Texto" name="texto" placeholder="Escribí el texto acá…" rows={3} required /><Field label="Puntaje (1–5)" name="puntaje" placeholder="1 a 5" type="number" defaultValue={5} />
                <MediaField tipo="imagen" label="Foto (opcional)" name="foto_url" />
                <Select name="curso_id" label="Mostrar en la ficha de" empty="Solo en el inicio" options={opcionesCursos} /></>}>
          {(tes ?? []).map((r) => (
            <Item key={r.id} tipo="testimonio" nombre="testimonio" row={r} resumen={<>{r.nombre} <span className="text-sm font-normal text-on-surface-variant">· {r.curso_id ? `ficha de ${nombreCurso(r.curso_id)}` : 'inicio'}</span></>} detalle={r.texto}>
              <Field label="Nombre" name="nombre" placeholder="Ej: María" defaultValue={r.nombre} required /><Field label="Curso (texto)" name="curso" placeholder="Ej: Reparación de celulares" defaultValue={r.curso} />
                <Field label="Texto" name="texto" placeholder="Escribí el texto acá…" rows={3} defaultValue={r.texto} required /><Field label="Puntaje (1–5)" name="puntaje" placeholder="1 a 5" type="number" defaultValue={r.puntaje ?? 5} />
                <MediaField tipo="imagen" label="Foto (opcional)" name="foto_url" defaultValue={r.foto_url} />
                <Select name="curso_id" label="Mostrar en la ficha de" defaultValue={r.curso_id} empty="Solo en el inicio" options={opcionesCursos} />
            </Item>
          ))}
        </Lista>
      )}
      {actual[0] === 'faq' && (
        <div className="space-y-6">
        <Setting clave="textos" abierto={false} title="Encabezado de la página" hint="Título y texto de presentación de Preguntas frecuentes.">
          {ayudaTextos}
          {texto('faq', 'titulo', 'Título')}{texto('faq', 'bajada', 'Texto', 2)}{texto('faq', 'descripcion', 'Descripción para Google (hasta 160 caracteres)', 2)}
        </Setting>
        <Lista tipo="faq" nombre="pregunta" vacio="Todavía no hay preguntas." nota="El inicio muestra las 4 primeras; la página Preguntas frecuentes, todas."
          nuevo={<><Field label="Pregunta" name="pregunta" placeholder="Ej: ¿Cómo me inscribo?" required /><Field label="Respuesta" name="respuesta" placeholder="Escribí la respuesta…" rows={4} required /></>}>
          {(faq ?? []).map((r) => (
            <Item key={r.id} tipo="faq" nombre="pregunta" row={r} resumen={r.pregunta} detalle={r.respuesta}>
              <Field label="Pregunta" name="pregunta" placeholder="Ej: ¿Cómo me inscribo?" defaultValue={r.pregunta} required /><Field label="Respuesta" name="respuesta" placeholder="Escribí la respuesta…" rows={4} defaultValue={r.respuesta} required />
            </Item>
          ))}
        </Lista>
        </div>
      )}
      {actual[0] === 'aulas' && (
        <div className="space-y-6">
          <Setting clave="textos" abierto={false} title="Título de la página" hint="El título grande de la sección «Aulas».">
            {texto('aulas', 'titulo', 'Título')}
          </Setting>
          <Setting clave="aulas" title="Presentación" hint="Lo primero que se ve en la sección «Aulas»: un texto corto y, si querés, un video general de todas las aulas.">
            <Field label="Texto de presentación" name="texto" rows={3} placeholder="Ej: Cursás en aulas-taller pensadas para practicar…" defaultValue={presentacion.texto} />
            <MediaField tipo="video" label="Video general (opcional)" name="video_url" defaultValue={presentacion.video_url} hint="Un recorrido por todas las aulas, de 1 a 2 minutos. Se ve con controles: el visitante decide cuándo darle play. Se comprime solo." />
            <MediaField tipo="imagen" label="Imagen de portada del video (opcional)" name="imagen_url" defaultValue={presentacion.imagen_url} hint="La que se ve antes de darle play. Si no cargás una, se usa el primer cuadro del video." />
          </Setting>
          <p className="text-sm text-on-surface-variant">
            Cada aula de la academia tiene su ficha para el sitio. El nombre y la capacidad se cambian en{' '}
            <Link href="/campus/admin/aulas" className="font-semibold text-secondary hover:underline">Campus › Aulas</Link>; la capacidad no se muestra en el sitio. Las aulas dadas de baja no aparecen acá ni en el sitio.
          </p>
          {!aulasActivas.length && <p className="card p-6 text-on-surface-variant">No hay aulas activas. Cargalas en Campus › Aulas.</p>}
          {aulasActivas.map((x) => {
            const f = ficha(x.id)
            return (
              <section key={x.id} className="card p-6">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold">{x.nombre}</h2>
                  {f?.visible ? <Badge tone="ok">Visible en el sitio</Badge> : <Badge>Oculta</Badge>}
                </div>
                <div className="max-w-3xl">
                  <ActionForm action={guardarFichaAula} reset={false}>
                    <input type="hidden" name="aula_id" value={x.id} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Check name="visible" defaultChecked={!!f?.visible}>Mostrar en el sitio</Check>
                      <Field label="Orden" name="orden" type="number" min={0} max={9999} placeholder="Ej: 1" defaultValue={f?.orden ?? 0} />
                    </div>
                    <Field label="Descripción" name="descripcion" rows={3} placeholder="Ej: Aula técnica para reparación de celulares, con un puesto completo por alumno." defaultValue={f?.descripcion} />
                    <div><span className="label">Destacados</span><p className="mb-2 text-xs text-on-surface-variant">Lo que tiene de bueno el aula: mesas de trabajo, equipamiento, comodidades… El tipo define el ícono.</p>
                      <DestacadosEditor inicial={((dest ?? []) as { aula_id: string; tipo: string; texto: string }[]).filter((d) => d.aula_id === x.id)} /></div>
                    <div><span className="label">Fotos</span>
                      <FotosEditor inicial={((fotos ?? []) as { aula_id: string; imagen_url: string; alt: string }[]).filter((d) => d.aula_id === x.id)} /></div>
                    <MediaField tipo="video" label="Video corto del aula (opcional)" name="video_url" defaultValue={f?.video_url} hint="Hasta 1 minuto. Se ve con controles." />
                  </ActionForm>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
