// Pone UNA contraseña nueva a todas las cuentas de prueba (@demo.example.com) para la demo al cliente. Las
// contraseñas se guardan con scrypt (sin vuelta atrás): no se pueden leer, solo reemplazar. No toca cuentas reales.
// Uso (en Coolify: terminal del contenedor app):  DEMO_PASSWORD='…' node scripts/clave-demo.mjs
import { randomBytes, scryptSync } from 'node:crypto'
import postgres from 'postgres'

const clave = process.env.DEMO_PASSWORD ?? ''
if (clave.length < 8) { console.error('Uso: DEMO_PASSWORD=… node scripts/clave-demo.mjs  (al menos 8 caracteres)'); process.exit(1) }
if (!process.env.DATABASE_URL) { console.error('Falta DATABASE_URL (correlo en el contenedor app).'); process.exit(1) }

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} })
try {
  const cuentas = await sql`select id, email from auth.users where email like ${'%@demo.example.com'} order by email`
  if (!cuentas.length) throw new Error('No hay cuentas @demo.example.com en esta base.')
  for (const c of cuentas) {
    // Mismo formato que src/lib/password-hash.ts. `sesion_desde` cierra las sesiones abiertas con la contraseña vieja.
    const sal = randomBytes(16)
    const hash = `scrypt$${sal.toString('base64')}$${scryptSync(clave, sal, 64).toString('base64')}`
    await sql`update auth.users set password_hash = ${hash}, sesion_desde = now() where id = ${c.id}`
  }
  console.log(`${cuentas.length} cuentas de prueba con la contraseña nueva:\n${cuentas.map((c) => c.email).join('\n')}`)
} catch (e) {
  console.error('Error:', e.message); process.exitCode = 1
} finally {
  await sql.end()
}
