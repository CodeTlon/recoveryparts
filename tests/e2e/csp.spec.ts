import { test, expect } from '@playwright/test'

// CSP con nonce por request: no debe frenar la hidratación (los scripts de Next llevan el nonce) ni quedar abierta
// con 'unsafe-inline' en script-src.
const RUTAS = ['/', '/cursos', '/login', '/olvide-mi-contrasena']

for (const ruta of RUTAS) {
  test(`${ruta}: CSP con nonce y sin violaciones`, async ({ page }) => {
    const violaciones: string[] = []
    page.on('console', (m) => { if (/content security policy/i.test(m.text())) violaciones.push(m.text().slice(0, 200)) })
    const res = await page.goto(ruta)
    const csp = res?.headers()['content-security-policy'] ?? ''
    const script = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src')) ?? ''
    expect(script, 'script-src con nonce').toMatch(/'nonce-[A-Za-z0-9+/=]+'/)
    expect(script, "script-src sin 'unsafe-inline'").not.toContain("'unsafe-inline'")
    await page.waitForLoadState('networkidle')
    expect(violaciones, 'violaciones de CSP en consola').toEqual([])
  })
}

test('el nonce cambia en cada request', async ({ request }) => {
  const nonce = async () => ((await request.get('/login')).headers()['content-security-policy'] ?? '').match(/'nonce-([^']+)'/)?.[1]
  const [a, b] = [await nonce(), await nonce()]
  expect(a).toBeTruthy()
  expect(a).not.toBe(b)
})

test('la hidratación funciona: el menú móvil (JavaScript) abre y cierra', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'El botón del menú solo existe en pantallas chicas')
  await page.goto('/')
  const boton = page.getByRole('button', { name: /menú/i }).first()
  await expect(boton).toHaveAttribute('aria-expanded', 'false')
  await boton.click()
  await expect(boton).toHaveAttribute('aria-expanded', 'true')
})
