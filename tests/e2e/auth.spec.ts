import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'
import { test, expect } from '@playwright/test'

// Flujo de acceso: invitación → paso de confirmación → sesión de activación → contraseña → campus → logout.
// Necesita una base con las migraciones aplicadas y la MISMA DATABASE_URL que usa la app; sin ella se omite
// (el resto de la suite corre sin base). Los usuarios que crea se borran al terminar.
const DATABASE_URL = process.env.DATABASE_URL
test.skip(!DATABASE_URL, 'Sin DATABASE_URL: este flujo necesita la base')

const PASSWORD = 'Contrasena-e2e-9'
let sql: postgres.Sql
const emails: string[] = []

test.beforeAll(() => { sql = postgres(DATABASE_URL!, { max: 1, onnotice: () => {} }) })
test.afterAll(async () => {
  for (const e of emails) await sql`delete from auth.users where email = ${e}`
  await sql.end()
})

// Crea un alumno invitado (cuenta pendiente) con un token de invitación conocido.
async function invitar(project: string) {
  const email = `e2e-${project}-${randomBytes(4).toString('hex')}@example.test`
  emails.push(email)
  const [u] = await sql<{ id: string }[]>`
    insert into auth.users (email, raw_user_meta_data, invited_at)
    values (${email}, ${sql.json({ rol: 'alumno', nombre: 'E2E', apellido: 'Prueba' })}, now()) returning id`
  const token = randomBytes(32).toString('base64url')
  await sql`insert into auth.tokens (user_id, tipo, token_hash, expira_en)
            values (${u.id}, 'invite', ${createHash('sha256').update(token).digest('hex')}, now() + interval '1 hour')`
  return { email, token, id: u.id }
}
const usadoEn = async (token: string) =>
  (await sql<{ usado_en: string | null }[]>`select usado_en from auth.tokens where token_hash = ${createHash('sha256').update(token).digest('hex')}`)[0]?.usado_en

test('[REQ-ACC-004] invitación: el link no se consume al abrirlo y la sesión de activación no entra al campus', async ({ page }, info) => {
  const { token } = await invitar(info.project.name)

  await page.goto(`/auth/confirm?token=${token}&type=invite`)
  await expect(page).toHaveURL(/\/activar\/confirmar\?/)
  expect(await usadoEn(token), 'abrir el link (GET) no debe gastar el token').toBeNull()

  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page).toHaveURL(/\/activar$/)
  await expect(page.getByRole('heading', { name: 'Creá tu contraseña' })).toBeVisible()
  expect(await usadoEn(token), 'el POST sí lo consume').not.toBeNull()

  // La sesión de activación solo sirve para definir la contraseña.
  await page.goto('/campus/alumno')
  await expect(page).toHaveURL(/\/login/)
})

test('[REQ-ACC-005] invitación completa: define la contraseña, entra a su sección y el link no se reutiliza', async ({ page }, info) => {
  const { token } = await invitar(info.project.name)
  await page.goto(`/auth/confirm?token=${token}&type=invite`)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page).toHaveURL(/\/activar$/)

  await page.getByLabel('Nueva contraseña', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Repetir contraseña', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Guardar y entrar' }).click()
  await expect(page).toHaveURL(/\/campus\/alumno/)

  // Cada rol solo entra a su sección.
  await page.goto('/campus/admin')
  await expect(page).toHaveURL(/\/campus\/alumno/)

  // El token era de un solo uso.
  await page.context().clearCookies()
  await page.goto(`/auth/confirm?token=${token}&type=invite`)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page).toHaveURL(/\/activar\?error=1/)
  await expect(page.getByRole('heading', { name: 'El link venció' })).toBeVisible()
})

test('[REQ-ACC-006] logout: la cookie anterior deja de valer', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'El botón de salir está en el menú lateral (solo escritorio)')
  const { token } = await invitar(info.project.name)
  await page.goto(`/auth/confirm?token=${token}&type=invite`)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Nueva contraseña', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Repetir contraseña', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Guardar y entrar' }).click()
  await expect(page).toHaveURL(/\/campus\/alumno/)

  const cookieVieja = (await context.cookies()).find((c) => c.name === 'rp_session')
  expect(cookieVieja).toBeTruthy()
  // Los tokens llevan `iat` en segundos y sesion_desde se compara por segundo: se espera a la siguiente.
  await page.waitForTimeout(1100)
  await page.getByRole('button', { name: 'Cerrar sesión' }).first().click()
  await expect(page).toHaveURL(/\/login/)

  await context.addCookies([cookieVieja!])
  await page.goto('/campus/alumno')
  await expect(page).toHaveURL(/\/login/)
})

test('[REQ-ACC-007] login con contraseña incorrecta muestra un error genérico', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('no-existe@example.test')
  await page.getByLabel('Contraseña', { exact: true }).fill('Incorrecta-123')
  await page.getByRole('button', { name: /ingresar|entrar/i }).click()
  // El anunciador de rutas de Next también es role=alert: se acota al párrafo del formulario.
  await expect(page.locator('p[role=alert]')).toContainText('Email o contraseña incorrectos')
})
