// Deshace el demo para el cliente: borra los datos de contenido y las cuentas @demo.example.com.
// Uso: ALLOW_DEMO_SEED=1 ENV_FILE=.env.production tsx scripts/purgar-demo.mts --purgar-demo
// Se niega si hay alumnos/profesores reales (no demo). NO toca al administrador real, aulas ni site_settings (esos hay que reeditarlos a mano).
// Hacé un backup (pg_dump) antes. Los PDFs de demo en STORAGE_DIR/materiales se borran junto con sus filas.
import postgres from 'postgres'
import { readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ENV_FILE = process.env.ENV_FILE ?? '.env.development'
if (!process.argv.includes('--purgar-demo') || process.env.ALLOW_DEMO_SEED !== '1') {
  console.error('Exige --purgar-demo y ALLOW_DEMO_SEED=1.'); process.exit(1)
}
const env = Object.fromEntries(readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
if (!env.DATABASE_URL) { console.error(`Falta DATABASE_URL en ${ENV_FILE}.`); process.exit(1) }
const pg = postgres(env.DATABASE_URL, { onnotice: () => {}, max: 1 })
const D = '%@demo.example.com'
const [{ n }] = await pg`select count(*)::int as n from profiles where rol in ('alumno', 'profesor') and email not like ${D}`
if (n > 0) { console.error(`Abortado: hay ${n} alumnos/profesores reales; no se purga.`); process.exit(1) }

const mats = await pg`select storage_path from materiales`.catch(() => [] as any[])
await pg.begin(async (tx) => {
  await tx`select set_config('role', 'service_role', true), set_config('app.role', 'service_role', true)`
  // TRUNCATE no dispara el trigger que impide borrar inscripciones; CASCADE arrastra clases, ediciones, materiales, etc.
  await tx.unsafe('truncate table cursos, cms_testimonios, cms_faq, cms_galeria, cms_egresados, kit_items, encuestas restart identity cascade')
  await tx`delete from auth.users where email like ${D}`
})
const dir = resolve(env.STORAGE_DIR ?? './storage')
for (const m of mats) if (m.storage_path) rmSync(join(dir, 'materiales', m.storage_path), { force: true })
console.log('Demo purgado. OJO: el seed pisó site_settings (hero, areas, nosotros, stats, contacto) y capacidades de aulas: reeditalos desde el CMS del admin.')
await pg.end()
