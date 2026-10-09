// Aplica db/bootstrap.sql y las migraciones pendientes de db/migrations contra DATABASE_URL.
// Uso: node scripts/migrate.mjs [--seed]
// Cada migración corre en su transacción y queda registrada en schema_migrations.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

function cargarEnv() {
  const archivo = process.env.ENV_FILE
  if (!archivo || !existsSync(archivo)) return
  for (const l of readFileSync(archivo, 'utf8').split('\n')) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
cargarEnv()

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL.')
  process.exit(1)
}

const sql = postgres(url, { max: 1, onnotice: () => {} })

try {
  await sql.file(join(raiz, 'db/bootstrap.sql'))
  await sql`create table if not exists schema_migrations (nombre text primary key, aplicada_en timestamptz not null default now())`
  const hechas = new Set((await sql`select nombre from schema_migrations`).map((r) => r.nombre))
  const archivos = readdirSync(join(raiz, 'db/migrations')).filter((f) => f.endsWith('.sql')).sort()
  for (const f of archivos) {
    if (hechas.has(f)) continue
    await sql.begin(async (tx) => {
      await tx.file(join(raiz, 'db/migrations', f))
      await tx`insert into schema_migrations (nombre) values (${f})`
    })
    console.log(`✔ ${f}`)
  }
  if (process.argv.includes('--seed')) {
    await sql.file(join(raiz, 'db/seed.sql'))
    console.log('✔ seed.sql')
  }
  console.log('Base al día.')
} catch (e) {
  console.error('Error aplicando migraciones:', e.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
