import { test, expect, type BrowserContext } from '@playwright/test'
import { DATABASE_URL, SESSION_SECRET, cookieDeSesion, crearEscenario, type Escenario } from './_campus'

// Campus por rol y acciones del admin, con sesiones firmadas como las de la app sobre datos propios de cada corrida.
// Necesitan la base y el MISMO SESSION_SECRET que la app; sin eso se omiten (el resto de la suite no los pide).
test.skip(!DATABASE_URL || !SESSION_SECRET, 'Sin DATABASE_URL y SESSION_SECRET: el campus necesita la base y sesiones firmadas')
test.describe.configure({ mode: 'serial' }) // un escenario por proyecto, todas las pruebas en el mismo worker

let e: Escenario
test.beforeAll(async ({}, info) => { e = await crearEscenario(info.project.name) })
test.afterAll(async () => { await e?.limpiar() })

async function entrarComo(context: BrowserContext, baseURL: string | undefined, userId: string) {
  await context.addCookies([{ name: 'rp_session', value: cookieDeSesion(userId), url: baseURL! }])
}

test('[REQ-ACC-001] cada rol entra solo a su sección', async ({ browser, baseURL }) => {
  const casos: [string, string, string, RegExp][] = [
    ['alumno', e.alumno, '/campus/admin', /\/campus\/alumno/],
    ['profesor', e.profesor, '/campus/admin', /\/campus\/profesor/],
    ['admin', e.admin, '/campus/alumno', /\/campus\/admin/],
    ['profesor', e.profesor, '/campus/alumno', /\/campus\/profesor/],
  ]
  for (const [rol, id, ruta, destino] of casos) {
    const ctx = await browser.newContext(); await entrarComo(ctx, baseURL, id)
    const page = await ctx.newPage()
    await page.goto(ruta)
    await expect(page, `${rol} pidiendo ${ruta}`).toHaveURL(destino)
    await ctx.close()
  }
})

test('[REQ-ACC-002] el alumno ve su curso y no el de otra persona', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext(); await entrarComo(ctx, baseURL, e.alumno)
  const page = await ctx.newPage()
  await page.goto('/campus/alumno')
  await expect(page.getByText(e.nombreCurso).first()).toBeVisible()
  await expect(page.getByText(e.nombreCursoAjeno)).toHaveCount(0)
  // Pedir por URL la edición de otra persona no muestra nada del curso ajeno.
  await page.goto(`/campus/alumno/curso/${e.edicionAjena}`)
  await expect(page.getByText(e.nombreCursoAjeno)).toHaveCount(0)
  await ctx.close()
})

test('[REQ-ACC-003] el profesor ve solo los cursos que dicta', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext(); await entrarComo(ctx, baseURL, e.profesor)
  const page = await ctx.newPage()
  await page.goto('/campus/profesor')
  await expect(page.getByText(e.nombreCurso).first()).toBeVisible()
  await expect(page.getByText(e.nombreCursoAjeno)).toHaveCount(0)
  await page.goto(`/campus/profesor/curso/${e.edicionAjena}`)
  await expect(page.getByText(e.nombreCursoAjeno)).toHaveCount(0)
  await ctx.close()
})

test('[REQ-CAL-005] el admin guarda el calendario sin avisar: la clase queda con aviso pendiente y el banner lo ofrece', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } }); await entrarComo(ctx, baseURL, e.admin)
  const page = await ctx.newPage()
  await page.goto(`/campus/admin/cursos/${e.curso}/ediciones/${e.edicion}?tab=calendario`)
  await page.locator('select').first().selectOption('suspendida')
  await page.getByLabel(/Avisar ahora por mail/).uncheck()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect.poll(async () => (await e.sql<{ n: number }[]>`select count(*)::int n from clases where edicion_id = ${e.edicion} and estado = 'suspendida' and aviso_pendiente`)[0].n).toBe(1)
  await page.reload()
  await expect(page.getByText(/sin avisar a los alumnos/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar avisos pendientes' })).toBeVisible()
  await ctx.close()
})

test('[REQ-ACC-009] el admin crea un usuario desde el formulario', async ({ browser, baseURL }) => {
  const email = `e2e-nuevo-${e.sufijo}@example.test`
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } }); await entrarComo(ctx, baseURL, e.admin)
  const page = await ctx.newPage()
  try {
    await page.goto('/campus/admin/usuarios')
    await page.getByRole('button', { name: /crear usuario/i }).first().click()
    const dialogo = page.getByRole('dialog')
    await dialogo.getByPlaceholder('Ej: María').fill('Nuevo')
    await dialogo.getByPlaceholder('Ej: González').fill(`Prueba ${e.sufijo}`)
    await dialogo.getByPlaceholder('nombre@ejemplo.com').fill(email)
    await dialogo.getByRole('button', { name: /Crear y enviar invitación/ }).click()
    // Sin SMTP el usuario se crea igual y la pantalla avisa que no salió el mail; con SMTP, se confirma.
    await expect.poll(async () => (await e.sql<{ n: number }[]>`select count(*)::int n from profiles where email = ${email} and estado_cuenta = 'pendiente_activacion'`)[0].n).toBe(1)
  } finally {
    await e.sql`delete from profiles where email = ${email}`
    await e.sql`delete from auth.users where email = ${email}`
    await ctx.close()
  }
})

test('[REQ-ACC-008] el admin deshabilita a un alumno y su sesión se corta al instante', async ({ browser, baseURL }) => {
  const ctxAlumno = await browser.newContext(); await entrarComo(ctxAlumno, baseURL, e.alumnoAjeno)
  const pageAlumno = await ctxAlumno.newPage()
  await pageAlumno.goto('/campus/alumno')
  await expect(pageAlumno).toHaveURL(/\/campus\/alumno/)

  const ctxAdmin = await browser.newContext({ viewport: { width: 1280, height: 1000 } }); await entrarComo(ctxAdmin, baseURL, e.admin)
  const page = await ctxAdmin.newPage()
  await page.goto(`/campus/admin/usuarios?q=${encodeURIComponent(`e2e-ajeno-${e.sufijo}@example.test`)}`)
  const fila = page.locator('li', { hasText: `e2e-ajeno-${e.sufijo}@example.test` }).first()
  const boton = fila.getByRole('button', { name: /Deshabilitar/ })
  await boton.focus()
  await page.keyboard.press('Enter') // con teclado el botón abre su modal de confirmación (con el mouse hay que mantener apretado)
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
  await expect.poll(async () => (await e.sql<{ estado: string }[]>`select estado_cuenta::text estado from profiles where id = ${e.alumnoAjeno}`)[0].estado).toBe('inactiva')

  await pageAlumno.goto('/campus/alumno')
  await expect(pageAlumno).toHaveURL(/\/login/)
  await ctxAlumno.close(); await ctxAdmin.close()
})

// Regresión (ERRORES.md, 2026-10-27): el proxy cortaba el cuerpo en 10 MB y todo PDF de más de 10 MB daba un 500.
test('regresión: el profesor sube un PDF de 12 MB y uno de más de 25 MB recibe el aviso', async ({ browser, baseURL }) => {
  test.setTimeout(90_000)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } }); await entrarComo(ctx, baseURL, e.profesor)
  const page = await ctx.newPage()
  const pdf = (mb: number) => { const b = Buffer.alloc(Math.round(mb * 1048576), 48); b.write('%PDF-1.4\n'); return b }
  const subir = async (titulo: string, mb: number) => {
    await page.goto(`/campus/profesor/curso/${e.edicion}`)
    await page.getByText('Subir material').click() // las formas de subir quedan plegadas detrás de este botón
    const form = page.locator('form', { has: page.getByRole('button', { name: 'Subir PDF' }) })
    await form.getByLabel('Título').fill(titulo)
    await form.locator('input[type=file]').setInputFiles({ name: `${titulo}.pdf`, mimeType: 'application/pdf', buffer: pdf(mb) })
    return form
  }
  const chico = await subir(`E2E 12MB ${e.sufijo}`, 12)
  await chico.getByRole('button', { name: 'Subir PDF' }).click()
  await expect(page.getByText(`E2E 12MB ${e.sufijo}`).first()).toBeVisible({ timeout: 30_000 })
  // El navegador frena el envío de un archivo de más de 25 MB…
  const grande = await subir(`E2E 26MB ${e.sufijo}`, 26)
  expect(await grande.locator('input[type=file]').evaluate((i: HTMLInputElement) => i.validationMessage)).toContain('25 MB')
  // …y si igual llega (sin la validación del navegador), el servidor contesta con el mensaje, no con un 500.
  await grande.evaluate((f: HTMLFormElement) => { f.noValidate = true; (f.querySelector('input[type=file]') as HTMLInputElement).setCustomValidity(''); f.requestSubmit() })
  await expect(grande.getByRole('alert')).toHaveText('El PDF supera los 25 MB.', { timeout: 30_000 })
  await e.sql`delete from materiales where edicion_id = ${e.edicion}`
  await ctx.close()
})

// Regresión (ERRORES.md, 2026-10-27): la consulta pedía aulas → cursos, que ya no existe (el aula está en la edición),
// y la pantalla decía «Todavía no hay aulas cargadas» aunque hubiera aulas.
test('regresión: Campus › Aulas lista las aulas cargadas', async ({ browser, baseURL }) => {
  const nombre = `Aula E2E ${e.sufijo}`
  await e.sql`insert into aulas (nombre, capacidad) values (${nombre}, 8)`
  const ctx = await browser.newContext(); await entrarComo(ctx, baseURL, e.admin)
  const page = await ctx.newPage()
  await page.goto('/campus/admin/aulas')
  await expect(page.getByText(nombre, { exact: true })).toBeVisible()
  await expect(page.getByText('Todavía no hay aulas cargadas.')).toHaveCount(0)
  await ctx.close()
  await e.sql.begin(async (tx) => { await tx`set local session_replication_role = replica`; await tx`delete from aulas where nombre = ${nombre}` })
})

// Campus más simple (2026-10-29): los reportes tienen página propia y el curso del profesor va por pestañas.
test('el admin ve los reportes en su página y el resumen ya no los repite', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext(); await entrarComo(ctx, baseURL, e.admin)
  const page = await ctx.newPage()
  await page.goto('/campus/admin')
  await expect(page.getByRole('heading', { name: 'Estado de las inscripciones' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Ver reportes' }).click() // el menú lateral en el celular va en un cajón
  await expect(page).toHaveURL(/\/campus\/admin\/reportes$/)
  await expect(page.getByRole('heading', { name: 'Reportes', level: 1 })).toBeVisible()
  await ctx.close()
})

test('los reportes se filtran por área y cada gráfico describe sus datos', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext(); await entrarComo(ctx, baseURL, e.admin)
  const page = await ctx.newPage()
  await page.goto('/campus/admin/reportes')
  await expect(page.getByRole('img', { name: /^Estado de las inscripciones: Finalizadas \d+/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /^Inscripciones por mes: / })).toBeVisible()
  const filtro = page.getByRole('navigation', { name: 'Filtrar por área' })
  await filtro.getByRole('link', { name: 'Creación y Diseño' }).click()
  await expect(page).toHaveURL(/area=diseno/)
  await expect(filtro.getByRole('link', { name: 'Creación y Diseño' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Ocupación por edición' }).or(page.getByText('No hay ediciones activas en esta área.'))).toBeVisible()
  await ctx.close()
})

test('Cursos y talleres del admin va paginado, con filtros en la URL, y una página de más vuelve a la última', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext(); await entrarComo(ctx, baseURL, e.admin)
  const page = await ctx.newPage()
  await page.goto('/campus/admin/cursos?pagina=999')
  await expect(page).not.toHaveURL(/pagina=999/)
  await expect(page.getByRole('heading', { name: 'Cursos y talleres', level: 1 })).toBeVisible()
  await page.goto('/campus/admin/cursos')
  const paginas = page.getByRole('navigation', { name: 'Páginas de cursos' })
  if (await paginas.count()) {
    await expect(paginas).toContainText(/Mostrando 1–15 de \d+ cursos/)
    await paginas.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/pagina=2/)
    await expect(paginas.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
  }
  await page.getByRole('link', { name: 'De baja' }).click()
  await expect(page).toHaveURL(/estado=baja/)
  await page.getByRole('searchbox', { name: 'Buscar curso por nombre' }).fill('zzz-no-existe')
  await page.getByRole('button', { name: 'Filtrar' }).click()
  await expect(page).toHaveURL(/q=zzz-no-existe/)
  await expect(page).toHaveURL(/estado=baja/)
  await expect(page.getByText('Ningún curso coincide con los filtros.')).toBeVisible()
  await ctx.close()
})

test('los textos de las páginas se editan desde Sitio web y se ven en el sitio', async ({ browser, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop', 'edita un texto compartido: corre en un solo tamaño para no pisarse')
  const ctx = await browser.newContext(); await entrarComo(ctx, baseURL, e.admin)
  const page = await ctx.newPage()
  await page.goto('/campus/admin/sitio')
  await page.getByRole('link', { name: /Preguntas/ }).first().click()
  await expect(page).toHaveURL(/tab=faq/)
  const bloque = page.locator('details', { hasText: 'Encabezado de la página' })
  await bloque.locator('summary').click()
  const titulo = `Dudas frecuentes ${Date.now()}`
  await bloque.getByLabel('Título').fill(titulo)
  await bloque.getByRole('button', { name: 'Guardar' }).click()
  await expect(bloque.getByText(/Guardado|Listo|Hecho/)).toBeVisible()
  const pub = await ctx.newPage()
  await pub.goto('/preguntas-frecuentes')
  await expect(pub.locator('h1')).toContainText(titulo.split(' ')[0])
  await expect(pub).toHaveTitle(new RegExp(titulo))
  // Vuelve al texto por defecto (campo vacío).
  await bloque.getByLabel('Título').fill('')
  await bloque.getByRole('button', { name: 'Guardar' }).click()
  // El aviso «Guardado» del primer guardado sigue en pantalla: se recarga hasta ver el cambio.
  await expect.poll(async () => { await pub.reload(); return pub.title() }, { timeout: 15_000 }).toMatch(/^Preguntas frecuentes/)
  await ctx.close()
})

test('el curso del profesor se recorre por pestañas (material, calendario, alumnos, estructura)', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext(); await entrarComo(ctx, baseURL, e.profesor)
  const page = await ctx.newPage()
  await page.goto(`/campus/profesor/curso/${e.edicion}`)
  const pestanas = page.getByRole('navigation', { name: 'Secciones del curso' })
  await expect(pestanas.getByRole('link', { name: /Material/ })).toHaveAttribute('aria-current', 'page')
  await pestanas.getByRole('link', { name: /Alumnos/ }).click()
  await expect(page).toHaveURL(/tab=alumnos/)
  await expect(pestanas.getByRole('link', { name: /Alumnos/ })).toHaveAttribute('aria-current', 'page')
  await ctx.close()
})

// Subidas del CMS: la foto se comprime en el navegador (WebP) y el video de la portada, subido al sitio, se tiene que ver
// en el inicio (antes solo se mostraba si era un link http(s) y el subido quedaba guardado pero invisible).
test('la foto del curso y el video de la portada se suben desde el admin y se ven en el sitio', async ({ browser, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop', 'cambia la portada compartida: corre en un solo tamaño para no pisarse')
  test.setTimeout(90_000)
  const ctx = await browser.newContext(); await entrarComo(ctx, baseURL, e.admin)
  const page = await ctx.newPage()
  // Archivos de prueba hechos en el navegador: una foto grande (4000×3000) y un video WebM de 2 s.
  await page.goto('/campus/admin')
  const { jpg, webm } = await page.evaluate(async () => {
    const b64 = async (blob: Blob) => { const a = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode(...a.subarray(i, i + 32768)); return btoa(s) }
    const c = document.createElement('canvas'); c.width = 4000; c.height = 3000; const x = c.getContext('2d')!
    x.fillStyle = '#c05010'; x.fillRect(0, 0, 4000, 3000)
    const foto = await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), 'image/jpeg', 0.9))
    const v = document.createElement('canvas'); v.width = 640; v.height = 360; const vx = v.getContext('2d')!
    const rec = new MediaRecorder(v.captureStream(30), { mimeType: 'video/webm' }); const partes: Blob[] = []
    rec.ondataavailable = (ev) => partes.push(ev.data); const fin = new Promise((ok) => { rec.onstop = ok })
    rec.start(); const t0 = performance.now()
    await new Promise<void>((ok) => { const f = () => { const t = performance.now() - t0; vx.fillStyle = `hsl(${t / 10},60%,40%)`; vx.fillRect(0, 0, 640, 360); if (t < 2000) requestAnimationFrame(f); else ok() }; f() })
    rec.stop(); await fin
    return { jpg: await b64(foto), webm: await b64(new Blob(partes, { type: 'video/webm' })) }
  })
  const subir = async (label: string, name: string, mimeType: string, datos: string) => {
    const caja = page.locator('div.sm\\:col-span-2', { has: page.locator(`span.label:text-is("${label}")`) })
    const oculto = caja.locator('input[type=hidden]'); const antes = await oculto.inputValue()
    await caja.locator('input[type=file]').setInputFiles({ name, mimeType, buffer: Buffer.from(datos, 'base64') })
    await expect.poll(() => oculto.inputValue(), { timeout: 30_000 }).not.toBe(antes)
    const url = await oculto.inputValue()
    expect(url).toMatch(/^\/media\/[0-9a-f-]+\.(webp|jpg|webm|mp4)$/)
    return url
  }

  // Foto del curso: se guarda como WebP achicada y la sirve /media.
  await page.goto(`/campus/admin/cursos/${e.curso}?tab=datos`); await page.waitForLoadState('networkidle')
  const foto = await subir('Imagen del curso', 'foto.jpg', 'image/jpeg', jpg)
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Guardado')).toBeVisible()
  const [{ imagen_url }] = await e.sql<{ imagen_url: string }[]>`select imagen_url from cursos where id = ${e.curso}`
  expect(imagen_url).toBe(foto)
  const r = await ctx.request.get(foto)
  expect(r.headers()['content-type']).toMatch(/^image\//)

  // Video de fondo de la portada: aparece en el inicio y se quita al terminar (la portada es compartida).
  await page.goto('/campus/admin/sitio?tab=inicio'); await page.waitForLoadState('networkidle')
  const portada = page.locator('details', { hasText: 'Portada' }).first()
  const video = await subir('Video de fondo (opcional)', 'video.webm', 'video/webm', webm)
  await portada.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(portada.getByText('Guardado')).toBeVisible()
  const pub = await ctx.newPage()
  await expect.poll(async () => { await pub.goto('/'); return pub.locator(`video[src="${video}"]`).count() }, { timeout: 15_000 }).toBe(1)
  await portada.locator('div.sm\\:col-span-2', { has: page.locator('span.label:text-is("Video de fondo (opcional)")') }).getByRole('button', { name: 'Quitar' }).click()
  await portada.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect.poll(async () => { await pub.goto('/'); return pub.locator('main video').count() }, { timeout: 15_000 }).toBe(0)
  await ctx.close()
})

// Pedido del cliente (2026-11-03): la foto de un grupo de egresados se sube con encuadre y zoom, elige cuánto ocupa en
// la grilla del inicio (columnas × filas) y, al tocarla, el visor muestra la foto (antes quedaba vacío mientras cargaba).
test('egresados: encuadre, zoom y tamaño en la grilla, y el visor muestra la foto', async ({ browser, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop', 'cambia la portada compartida: corre en un solo tamaño para no pisarse')
  test.setTimeout(90_000)
  const ctx = await browser.newContext(); await entrarComo(ctx, baseURL, e.admin)
  const page = await ctx.newPage()
  await page.goto('/campus/admin/sitio?tab=egresados'); await page.waitForLoadState('networkidle')
  const jpg = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const x = c.getContext('2d')!
    x.fillStyle = '#1060c0'; x.fillRect(0, 0, 1200, 900); x.fillStyle = '#c05010'; x.fillRect(600, 0, 600, 900)
    const b = await new Promise<Blob>((ok) => c.toBlob((v) => ok(v!), 'image/jpeg', 0.9))
    const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode(...a.subarray(i, i + 32768)); return btoa(s)
  })
  const curso = `E2E grupo ${Date.now()}`
  await page.getByRole('button', { name: 'Agregar grupo' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Curso o taller').fill(curso)
  await modal.getByLabel('Orden').fill('0')
  await modal.locator('input[type=file]').setInputFiles({ name: 'grupo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpg, 'base64') })
  const oculto = modal.locator('input[type=hidden][name=foto_url]')
  await expect.poll(() => oculto.inputValue(), { timeout: 30_000 }).toMatch(/^\/media\//)
  // Recién subida se abre el encuadre: tocar el borde derecho y subir el zoom a 2×.
  const vista = modal.getByRole('slider', { name: 'Punto de la foto que queda a la vista' })
  const caja = (await vista.boundingBox())!
  await page.mouse.click(caja.x + caja.width * 0.9, caja.y + caja.height * 0.5)
  await modal.locator('input[type=range]').fill('2')
  await expect(oculto).toHaveValue(/#foco=(8\d|9\d),50,2$/)
  // 2 columnas × 2 filas en la computadora.
  await modal.getByRole('group', { name: 'Tamaño en la computadora' }).getByRole('button', { name: '2 columnas × 2 filas' }).click()
  await modal.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect.poll(async () => (await e.sql<{ n: number }[]>`select count(*)::int n from cms_egresados where curso = ${curso} and cols = 2 and filas = 2 and foto_url like '%#foco=%'`)[0].n, { timeout: 10_000 }).toBe(1)

  try {
    const pub = await ctx.newPage()
    const tarjeta = pub.locator('section[aria-labelledby="t-egresados"] button', { has: pub.locator(`img[alt^="Grupo de egresados de ${curso}"]`) })
    await expect.poll(async () => { await pub.goto('/'); return tarjeta.count() }, { timeout: 15_000 }).toBe(1)
    await expect(tarjeta).toHaveClass(/lg:col-span-2/)
    await expect(tarjeta).toHaveClass(/lg:row-span-2/)
    const img = tarjeta.locator('img')
    expect(await img.getAttribute('src')).not.toContain('foco') // el optimizador recibe la URL limpia
    expect(await img.evaluate((i) => getComputedStyle(i).transform)).not.toBe('none')
    await tarjeta.click()
    const visor = pub.getByRole('dialog')
    const grande = visor.locator('img')
    await expect(grande).toHaveCSS('opacity', '1', { timeout: 15_000 })
    expect((await grande.boundingBox())!.height).toBeGreaterThan(100)
    await pub.keyboard.press('Escape')
    await expect(visor).toBeHidden()
  } finally {
    await e.sql`delete from cms_egresados where curso = ${curso}`
    await ctx.close()
  }
})
