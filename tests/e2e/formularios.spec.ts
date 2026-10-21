import postgres from 'postgres'
import { test, expect } from '@playwright/test'

// Formularios públicos (los envía un visitante sin sesión): contacto y «avisame cuando se dicte».
// Necesitan la base (sin ella el formulario avisa que no está disponible): se omiten sin DATABASE_URL.
// Antes de que el constructor de consultas dejara de pedir RETURNING, ambos fallaban siempre para el visitante.
const DATABASE_URL = process.env.DATABASE_URL
test.skip(!DATABASE_URL, 'Sin DATABASE_URL: estos formularios necesitan la base')

let sql: postgres.Sql
// Los envíos se limitan por IP (5 cada 15 min): cada prueba simula una IP distinta, como detrás de un proxy.
const ipUnica = () => `10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`
test.beforeAll(() => { sql = postgres(DATABASE_URL!, { max: 1, onnotice: () => {} }) })
// Cada prueba borra SOLO lo suyo: los proyectos corren en paralelo y un borrado por patrón pisaría al de otro worker.
const emails: string[] = [], intereses: string[] = []
test.afterAll(async () => {
  if (emails.length) await sql`delete from contactos where email in ${sql(emails)}`
  if (intereses.length) await sql`delete from demanda_cursos where interes in ${sql(intereses)}`
  await sql.end()
})

test('contacto: se envía y queda en la bandeja', async ({ page }, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@example.test`
  emails.push(email)
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': ipUnica() })
  await page.goto('/contacto')
  await page.fill('#c-nombre', 'Visitante E2E')
  await page.fill('#c-email', email)
  await page.fill('#c-msg', 'Consulta de prueba automática')
  await page.getByRole('button', { name: /enviar/i }).click()
  await expect(page.getByText('Recibimos tu consulta')).toBeVisible()
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int n from contactos where email = ${email}`
  expect(n).toBe(1)
})

test('demanda de cursos: se registra el interés', async ({ page }, info) => {
  const interes = `E2E ${info.project.name} ${Date.now()}`
  intereses.push(interes)
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': ipUnica() })
  await page.goto('/cursos?q=zzz-curso-que-no-existe')
  await page.getByLabel('Curso de interés').fill(interes)
  await page.getByRole('button', { name: 'Avisarme' }).click()
  await expect.poll(async () => (await sql<{ n: number }[]>`select count(*)::int n from demanda_cursos where interes = ${interes}`)[0].n).toBe(1)
})
