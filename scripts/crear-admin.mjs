// Crea (o resetea la contraseña de) un administrador. Pensado para el primer admin en un entorno vacío.
// Uso:  ADMIN_PASSWORD='…' node scripts/crear-admin.mjs email@dominio.com Nombre Apellido
// (en Coolify: terminal del contenedor app). La contraseña no se pasa por argumento para no quedar en el historial.
import { randomBytes, scryptSync } from 'node:crypto'
import postgres from 'postgres'

const [email, nombre = 'Admin', apellido = 'Recovery'] = process.argv.slice(2)
const password = process.env.ADMIN_PASSWORD ?? ''
if (!email || !/^\S+@\S+\.\S+$/.test(email)) { console.error('Uso: ADMIN_PASSWORD=… node scripts/crear-admin.mjs email [nombre] [apellido]'); process.exit(1) }
if (password.length < 10) { console.error('ADMIN_PASSWORD debe tener al menos 10 caracteres.'); process.exit(1) }
if (!process.env.DATABASE_URL) { console.error('Falta DATABASE_URL.'); process.exit(1) }

// Mismo formato que src/lib/password-hash.ts.
const salt = randomBytes(16)
const hash = `scrypt$${salt.toString('base64')}$${scryptSync(password, salt, 64).toString('base64')}`

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} })
try {
  const e = email.toLowerCase()
  const [existente] = await sql`select u.id, p.rol from auth.users u left join public.profiles p on p.id = u.id where u.email = ${e}`
  if (existente && existente.rol !== 'admin') throw new Error('Ese email ya existe con otro rol.')
  // invited_at hace que el trigger cree el perfil con el rol de los metadatos; email_confirmed_at lo deja activo.
  if (!existente) {
    await sql`insert into auth.users (email, raw_user_meta_data, invited_at, email_confirmed_at, password_hash)
      values (${e}, ${sql.json({ rol: 'admin', nombre, apellido })}, now(), now(), ${hash})`
  } else {
    await sql`update auth.users set password_hash = ${hash}, sesion_desde = now() where id = ${existente.id}`
  }
  console.log(`✔ Administrador listo: ${e}`)
} catch (e) {
  console.error('Error:', e.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
