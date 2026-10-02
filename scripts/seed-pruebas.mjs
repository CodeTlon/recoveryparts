// Cuentas y datos de PRUEBA para desarrollo (Supabase local) o test (homologación). Idempotente.
// Uso: npm run seed:dev   |   npm run seed:test
// Se niega a correr si APP_ENV no es development/test. Emails @homologacion.example.com
// (dominio reservado: no reciben mails). No envía ningún mail. Contraseñas al azar, se imprimen al final.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'

const ENV_FILE = process.env.ENV_FILE ?? '.env.development'
if (!process.argv.includes('--confirmo-no-produccion')) {
  console.error('Este script crea datos de prueba. Corrélo con --confirmo-no-produccion (desarrollo o test).')
  process.exit(1)
}
const env = Object.fromEntries(readFileSync(ENV_FILE, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
if (!['development', 'test'].includes(env.APP_ENV ?? '')) {
  console.error(`Abortado: ${ENV_FILE} no declara APP_ENV=development|test (APP_ENV=${env.APP_ENV ?? 'sin definir'}).`)
  process.exit(1)
}
console.log(`Entorno: ${env.APP_ENV} → ${env.NEXT_PUBLIC_SUPABASE_URL}`)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const ok = (r, ctx) => { if (r.error) throw new Error(`${ctx}: ${r.error.message}`); return r.data }

const D = '@homologacion.example.com'
const USUARIOS = [
  { key: 'admin', rol: 'administrador', nombre: 'Ana', apellido: 'Administradora' },
  { key: 'profe_a', rol: 'profesor', nombre: 'Pablo', apellido: 'Profesor-A' },
  { key: 'profe_b', rol: 'profesor', nombre: 'Paula', apellido: 'Profesora-B' },
  { key: 'alumno1', rol: 'alumno', nombre: 'Lucas', apellido: 'Alumno-Uno' },
  { key: 'alumno2', rol: 'alumno', nombre: 'Mariana', apellido: 'Alumna-Dos' },
  { key: 'alumno3', rol: 'alumno', nombre: 'Tomás', apellido: 'Alumno-Tres' },
].map((u) => ({ ...u, email: `${u.key.replace('_', '.')}${D}`, password: randomBytes(9).toString('base64url') + '!a1' }))

// ── 1. Usuarios (sin mail) ─────────────────────────────────
const ids = {}
for (const u of USUARIOS) {
  let { data: p } = await sb.from('profiles').select('id').eq('email', u.email).maybeSingle()
  if (!p) {
    // generateLink(invite) crea el usuario invitado (la migración 0006 crea el perfil con su rol) sin mandar mail.
    const g = ok(await sb.auth.admin.generateLink({ type: 'invite', email: u.email, options: { data: { rol: u.rol, nombre: u.nombre, apellido: u.apellido } } }), `crear ${u.email}`)
    p = { id: g.user.id }
  }
  ok(await sb.auth.admin.updateUserById(p.id, { password: u.password, email_confirm: true }), `password ${u.email}`)
  ok(await sb.from('profiles').upsert({ id: p.id, email: u.email, rol: u.rol, nombre: u.nombre, apellido: u.apellido, telefono: u.rol === 'alumno' ? '3510000000' : null }), `perfil ${u.email}`)
  ids[u.key] = p.id
}

// ── 2. Cursos ──────────────────────────────────────────────
const CURSOS = [
  { slug: 'reparacion-de-celulares', titulo: 'Reparación de Celulares', tipo: 'curso', area: 'tecnico', cupo_total: 4, duracion_semanas: 12, precio: 90000, precio_descuento: 81000, fecha_inicio: '2026-09-14', dias_semana: [1], hora_inicio: '18:00', hora_fin: '20:00', aula: 'Aula 1', profesor_id: ids.profe_a, destacado: true, orden_destacado: 1,
    descripcion: 'Aprendé diagnóstico y reparación de celulares desde cero, con equipos reales. (Curso de prueba)', requisitos: 'No se necesitan conocimientos previos. Traer notebook.',
    temario: [{ titulo: 'Fundamentos y diagnóstico', descripcion: 'Herramientas del taller, seguridad ESD, apertura segura.' }, { titulo: 'Reemplazo de módulos', descripcion: 'Pantallas, baterías y cámaras.' }],
    kit_items: [{ nombre: 'Soldador de punta fina', descripcion: 'Para microsoldadura', precio: 15000, link: 'https://example.com/soldador' }, { nombre: 'Estaño y flux', descripcion: 'Pack de insumos', precio: 6500, link: 'https://example.com/estano' }],
    clases: [[1, '2026-09-14', 'Introducción y herramientas', 'programada'], [2, '2026-09-21', 'Diagnóstico visual', 'suspendida'], [3, '2026-09-28', 'Apertura y desarme', 'programada'], [4, '2026-10-05', 'Reemplazo de pantalla', 'programada'], [5, '2026-10-12', 'Baterías', 'programada'], [6, '2026-10-19', 'Cámaras y flexores', 'programada']] },
  { slug: 'carteles-neon-led', titulo: 'Carteles Neón LED', tipo: 'curso', area: 'diseno', cupo_total: 2, duracion_semanas: 8, precio: 75000, fecha_inicio: '2026-10-07', dias_semana: [3], hora_inicio: '18:00', hora_fin: '20:00', aula: 'Aula 2', profesor_id: ids.profe_b, destacado: true, orden_destacado: 2,
    descripcion: 'Diseño y armado de carteles de neón LED. (Curso de prueba, cupo completo a propósito)', requisitos: '', temario: [{ titulo: 'Diseño del cartel', descripcion: 'Bocetos y materiales.' }], kit_items: [],
    clases: [[1, '2026-10-07', 'Introducción al neón LED', 'programada'], [2, '2026-10-14', 'Armado', 'programada']] },
  { slug: 'taller-cambio-de-glass', titulo: 'Taller de Cambio de Glass', tipo: 'taller', area: 'tecnico', cupo_total: 6, duracion_semanas: 2, precio: 40000, fecha_inicio: '2026-09-05', dias_semana: [6], hora_inicio: '10:00', hora_fin: '12:00', aula: 'Aula 3', profesor_id: ids.profe_a, destacado: false, orden_destacado: 0,
    descripcion: 'Taller intensivo de cambio de vidrio en pantallas. (Taller de prueba, ya finalizado)', requisitos: '', temario: [], kit_items: [],
    clases: [[1, '2026-09-05', 'Separación de glass', 'programada'], [2, '2026-09-12', 'Pegado y curado', 'programada']] },
]
const cid = {}
for (const { clases, ...c } of CURSOS) {
  const hoy = new Date().toISOString().slice(0, 10)
  const row = { ...c, publicado: true, precio_actualizado_en: hoy }
  const ex = (await sb.from('cursos').select('id').eq('slug', c.slug).maybeSingle()).data
  const data = ex ? (ok(await sb.from('cursos').update(row).eq('id', ex.id), `curso ${c.slug}`), ex) : ok(await sb.from('cursos').insert(row).select('id').single(), `curso ${c.slug}`)
  cid[c.slug] = data.id
  for (const [numero, fecha, tema, estado] of clases) {
    const e = (await sb.from('clases').select('id').eq('curso_id', data.id).eq('numero', numero).maybeSingle()).data
    if (e) ok(await sb.from('clases').update({ fecha, tema, estado }).eq('id', e.id), 'clase'); else ok(await sb.from('clases').insert({ curso_id: data.id, numero, fecha, tema, estado }), 'clase')
  }
}

// ── 3. Matrículas (no se borran; se saltea lo que ya existe) ─
async function matricular(alumno, slug, patch) {
  let m = (await sb.from('matriculas').select('id, estado').eq('alumno_id', ids[alumno]).eq('curso_id', cid[slug]).maybeSingle()).data
  if (!m) m = ok(await sb.from('matriculas').insert({ alumno_id: ids[alumno], curso_id: cid[slug] }).select('id, estado').single(), `matricula ${alumno}`)
  if (patch && m.estado === 'activo') ok(await sb.from('matriculas').update(patch).eq('id', m.id), `estado ${alumno}`)
}
await matricular('alumno1', 'reparacion-de-celulares')
await matricular('alumno2', 'reparacion-de-celulares', { estado: 'desertor', fecha_desercion: '2026-09-29', motivo_baja: 'Cambió de horario laboral (prueba)' })
await matricular('alumno3', 'reparacion-de-celulares')
await matricular('alumno1', 'carteles-neon-led')
await matricular('alumno3', 'carteles-neon-led')
await matricular('alumno3', 'taller-cambio-de-glass', { estado: 'finalizado' })

// ── 4. Material (PDF real mínimo + link) ───────────────────
const pdf = (t) => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 56>>stream\nBT /F1 14 Tf 20 70 Td (${t}) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`)
const claseId = async (slug, n) => ok(await sb.from('clases').select('id').eq('curso_id', cid[slug]).eq('numero', n).single(), 'clase').id
async function material(slug, titulo, extra, archivo) {
  if ((await sb.from('materiales').select('id').eq('curso_id', cid[slug]).eq('titulo', titulo).maybeSingle()).data) return
  const row = { curso_id: cid[slug], titulo, ...extra }
  if (archivo) {
    const path = `${cid[slug]}/${randomUUID()}.pdf`
    ok(await sb.storage.from('materiales').upload(path, archivo, { contentType: 'application/pdf' }), `subir ${titulo}`)
    Object.assign(row, { tipo: 'pdf', storage_path: path })
  } else row.tipo = 'link'
  ok(await sb.from('materiales').insert(row), `material ${titulo}`)
}
const ahora = new Date(Date.now() - 60_000).toISOString()
await material('reparacion-de-celulares', 'Apunte Clase 1 (liberado)', { liberado_en: ahora, clase_id: await claseId('reparacion-de-celulares', 1) }, pdf('Apunte clase 1 - prueba'))
await material('reparacion-de-celulares', 'Apunte Clase 6 (oculto)', { liberado_en: '2099-12-01T00:00:00Z', clase_id: await claseId('reparacion-de-celulares', 6) }, pdf('Apunte clase 6 - OCULTO'))
await material('reparacion-de-celulares', 'Video introductorio (link)', { liberado_en: ahora, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
await material('taller-cambio-de-glass', 'Guía de cambio de glass', { liberado_en: ahora }, pdf('Guia glass - prueba'))

// ── 5. Encuesta, CMS ───────────────────────────────────────
if (!(await sb.from('encuesta_preguntas').select('id').eq('curso_id', cid['taller-cambio-de-glass']).limit(1)).data?.length)
  ok(await sb.from('encuesta_preguntas').insert([{ curso_id: cid['taller-cambio-de-glass'], pregunta: '¿Cómo calificás al profesor?', tipo: 'rating', orden: 1 }, { curso_id: cid['taller-cambio-de-glass'], pregunta: '¿Qué mejorarías?', tipo: 'texto', orden: 2 }]), 'encuesta')
ok(await sb.from('sitio_config').upsert({ id: 1,
  hero: { titulo: 'Aprendé un oficio con equipos reales', subtitulo: 'Cursos y talleres presenciales de diseño y tecnología en Córdoba. (texto de prueba)' },
  areas: { tecnico: { titulo: 'Reparación y Tecnología', descripcion: 'Celulares, impresoras, notebooks, PC y televisores.' }, diseno: { titulo: 'Creación y Diseño', descripcion: 'Estampado, impresión 3D, cartelería y señalética.' } },
  stats: { aulas: 3, profesores: 10, egresados: 0 },
  contacto: { whatsapp: '', direccion: 'La Rioja 345, X5022 Córdoba', instagram: null, email: '' } }), 'sitio_config')
if (!(await sb.from('faq').select('id').limit(1)).data?.length)
  ok(await sb.from('faq').insert([{ pregunta: '¿Necesito conocimientos previos?', respuesta: 'No, los cursos inicial arrancan desde cero. (prueba)', orden: 1, publicado: true }, { pregunta: '¿Dónde se cursa?', respuesta: 'Presencial en La Rioja 345, Córdoba.', orden: 2, publicado: true }]), 'faq')
if (!(await sb.from('testimonios').select('id').limit(1)).data?.length)
  ok(await sb.from('testimonios').insert([{ nombre: 'Egresado de prueba', curso_id: cid['reparacion-de-celulares'], puntaje: 5, comentario: 'Excelente curso, 100% práctico. (testimonio de prueba)', orden: 1, publicado: true }]), 'testimonios')

// ── Salida ─────────────────────────────────────────────────
console.log(`\nCUENTAS DE PRUEBA (${env.APP_ENV})\n` + USUARIOS.map((u) => `${u.rol.padEnd(13)} ${u.email.padEnd(34)} ${u.password}`).join('\n'))
writeFileSync(process.env.CREDS_OUT ?? '/dev/null', JSON.stringify({ usuarios: USUARIOS, ids, cursos: cid }, null, 2), { mode: 0o600 })
