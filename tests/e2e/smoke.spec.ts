import { test, expect } from '@playwright/test'

// Smoke E2E resiliente: valida lo determinístico que no depende de los datos del CMS.
//  - cada ruta pública responde sin error y monta el layout
//  - el campus exige sesión
//  - health, SEO (robots, sitemap) y 404
// Corre en 3 viewports (mobile / tablet / desktop), contra `npm run build && npm start` o contra BASE_URL (test).

const RUTAS_PUBLICAS = ['/', '/cursos', '/galeria', '/preguntas-frecuentes', '/contacto', '/login', '/olvide-mi-contrasena']

test.describe('Público: renderiza sin error', () => {
  for (const ruta of RUTAS_PUBLICAS) {
    test(`${ruta} responde <400 y tiene contenido`, async ({ page }) => {
      const res = await page.goto(ruta)
      expect(res?.status(), `status HTTP de ${ruta}`).toBeLessThan(400)
      await expect(page.locator('body')).not.toBeEmpty()
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  }
})

test.describe('Público: título animado', () => {
  test('el título de la portada se lee con espacios entre palabras', async ({ page }) => {
    await page.goto('/')
    // Cada palabra va en su propio inline-block; si el espacio queda adentro, el navegador lo descarta y el h1 se lee
    // «Aprendéunoficio…» (pasó en v0.17.0).
    const h1 = (await page.locator('h1').first().innerText()).trim()
    expect(h1.split(/\s+/).length, `h1: «${h1}»`).toBeGreaterThan(1)
  })

  test('el fondo de circuito arranca sin errores de consola ni de CSP', async ({ page }) => {
    const errores: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
    page.on('pageerror', (e) => errores.push(e.message))
    await page.goto('/', { waitUntil: 'load' })
    await expect(page.locator('canvas').first()).toBeAttached()
    await page.waitForTimeout(1500)
    expect(errores).toEqual([])
  })
})

test.describe('Público: filtros de cursos', () => {
  test('en el celular nivel/día/orden se abren con «Más filtros»; en pantallas grandes se ven siempre', async ({ page }) => {
    await page.goto('/cursos')
    const nivel = page.getByLabel('Nivel')
    if ((page.viewportSize()?.width ?? 1280) >= 768) {
      await expect(nivel).toBeVisible()
      await expect(page.getByRole('button', { name: /Más filtros/ })).toBeHidden()
      return
    }
    await expect(nivel).toBeHidden()
    await page.getByRole('button', { name: /Más filtros/ }).click()
    await expect(nivel).toBeVisible()
    await expect(page.getByRole('button', { name: /Menos filtros/ })).toHaveAttribute('aria-expanded', 'true')
  })
})

test.describe('Campus: exige sesión', () => {
  for (const ruta of ['/campus/alumno', '/campus/admin']) {
    test(`${ruta} sin sesión no muestra el campus`, async ({ page }) => {
      await page.goto(ruta)
      await expect(page).toHaveURL(/\/login\b/)
    })
  }
})

test.describe('Infra y SEO', () => {
  test('/api/health responde con estado y arranque', async ({ request }) => {
    const res = await request.get('/api/health')
    // Sin base (build de CI) responde 503; con base, 200. En ambos casos es JSON y no revienta.
    expect([200, 503]).toContain(res.status())
    expect(res.headers()['content-type']).toContain('application/json')
  })

  test('robots.txt y sitemap.xml existen', async ({ request }) => {
    expect((await request.get('/robots.txt')).status()).toBe(200)
    expect((await request.get('/sitemap.xml')).status()).toBe(200)
  })

  test('un curso inexistente da 404 real (no un 200 con noindex)', async ({ request }) => {
    const res = await request.get('/cursos/este-curso-no-existe-seguro')
    expect(res.status()).toBe(404)
  })

  test('una ruta inexistente da 404', async ({ page }) => {
    const res = await page.goto('/esta-ruta-no-existe')
    expect(res?.status()).toBe(404)
  })
})
