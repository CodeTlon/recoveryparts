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
