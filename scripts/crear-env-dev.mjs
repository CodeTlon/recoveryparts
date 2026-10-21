// Crea `.env.development` a partir de `.env.development.example` con un SESSION_SECRET aleatorio.
// No pisa un archivo existente. Uso: npm run setup:dev
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const destino = '.env.development', ejemplo = '.env.development.example'
if (existsSync(destino)) { console.log(`${destino} ya existe: no se toca.`); process.exit(0) }
if (!existsSync(ejemplo)) { console.error(`Falta ${ejemplo}.`); process.exit(1) }
copyFileSync(ejemplo, destino)
const secreto = randomBytes(48).toString('base64url')
writeFileSync(destino, readFileSync(destino, 'utf8').replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${secreto}`))
console.log(`${destino} creado con un SESSION_SECRET nuevo. Siguiente: npm run db:start && npm run db:migrate && npm run dev`)
