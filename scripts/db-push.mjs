// Aplica las migraciones pendientes a un entorno remoto. Uso: npm run db:push:test | db:push:production
// Lee SUPABASE_DB_URL de .env.<entorno> (o del entorno, en CI). Muestra primero qué se va a aplicar.
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'

const target = process.argv[2]
if (!['test', 'production'].includes(target)) { console.error('Uso: node scripts/db-push.mjs <test|production>'); process.exit(1) }

const file = `.env.${target}`
const env = { ...process.env }
if (existsSync(file)) for (const l of readFileSync(file, 'utf8').split('\n')) { const i = l.indexOf('='); if (i > 0 && !l.startsWith('#') && !(l.slice(0, i) in env)) env[l.slice(0, i)] = l.slice(i + 1) }
if (!env.SUPABASE_DB_URL) { console.error(`Falta SUPABASE_DB_URL (en ${file} o en el entorno).`); process.exit(1) }
if (env.APP_ENV && env.APP_ENV !== target) { console.error(`${file} declara APP_ENV=${env.APP_ENV}, no ${target}. Abortado.`); process.exit(1) }

const run = (args) => spawnSync('npx', ['supabase', ...args], { stdio: 'inherit', env })
console.log(`\n== Migraciones pendientes en ${target} ==`)
if (run(['db', 'push', '--db-url', env.SUPABASE_DB_URL, '--dry-run']).status !== 0) process.exit(1)

if (!process.env.CI) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const a = await rl.question(`\n¿Aplicar a ${target.toUpperCase()}? Escribí "${target}" para confirmar: `); rl.close()
  if (a.trim() !== target) { console.log('Cancelado.'); process.exit(0) }
}
process.exit(run(['db', 'push', '--db-url', env.SUPABASE_DB_URL]).status ?? 1)
