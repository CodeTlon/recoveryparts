// Cuentas y datos de PRUEBA para desarrollo (Supabase local) u homologación. Idempotente.
// Uso: ENV_FILE=.env.development node scripts/seed-pruebas.mjs --confirmo-no-produccion
//      ENV_FILE=.env.staging     node scripts/seed-pruebas.mjs --confirmo-no-produccion
// Se niega a correr si APP_ENV=production. Emails @homologacion.example.com (fáciles de borrar).
// No envía ningún mail. Las contraseñas se generan al azar y se imprimen al final.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'

const ENV_FILE = process.env.ENV_FILE ?? '.env.development'
if (!process.argv.includes('--confirmo-no-produccion')) {
  console.error('Este script crea datos de prueba. Corrélo con --confirmo-no-produccion (desarrollo u homologación).')
  process.exit(1)
}

const env = Object.fromEntries(readFileSync(ENV_FILE, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
if (env.APP_ENV === 'production' || !['development', 'staging'].includes(env.APP_ENV ?? '')) {
  console.error(`Abortado: ${ENV_FILE} no declara APP_ENV=development|staging (APP_ENV=${env.APP_ENV ?? 'sin definir'}).`)
  process.exit(1)
}
console.log(`Entorno: ${env.APP_ENV} → ${env.NEXT_PUBLIC_SUPABASE_URL}`)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const ok = (r, ctx) => { if (r.error) throw new Error(`${ctx}: ${r.error.message}`); return r.data }

const D = '@homologacion.example.com'
const USUARIOS = [
  { key: 'admin', rol: 'admin', nombre: 'Ana', apellido: 'Administradora' },
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
    // generateLink(invite) crea el usuario con invited_at (pasa el bloqueo de autoregistro) y NO envía mail.
    const g = ok(await sb.auth.admin.generateLink({ type: 'invite', email: u.email, options: { data: { rol: u.rol, nombre: u.nombre, apellido: u.apellido } } }), `crear ${u.email}`)
    p = { id: g.user.id }
  }
  ok(await sb.auth.admin.updateUserById(p.id, { password: u.password, email_confirm: true }), `password ${u.email}`)
  ok(await sb.from('profiles').update({ rol: u.rol, estado_cuenta: 'activa', nombre: u.nombre, apellido: u.apellido, telefono: u.rol === 'alumno' ? '3510000000' : null }).eq('id', p.id), `perfil ${u.email}`)
  ids[u.key] = p.id
}
ok(await sb.from('profiles').update({ experiencia: 'Técnico con 10 años de experiencia en microelectrónica. (dato de prueba)', certificaciones: 'Curso de microsoldadura (prueba)' }).eq('id', ids.profe_a), 'mini-cv')

// ── 2. Cursos ──────────────────────────────────────────────
const aulas = Object.fromEntries(ok(await sb.from('aulas').select('id, nombre'), 'aulas').map((a) => [a.nombre, a.id]))
const CURSOS = [
  { slug: 'reparacion-de-celulares', nombre: 'Reparación de Celulares', area: 'tecnico', tipo: 'curso', nivel: 'Inicial', cupo: 4, duracion_semanas: 12, precio: 90000, descuento_pct: 10, fecha_inicio: '2026-09-14', aula_id: aulas['Aula 1'], profesor_id: ids.profe_a, destacado: true, orden: 1,
    descripcion: 'Aprendé diagnóstico y reparación de celulares desde cero, con equipos reales. (Curso de prueba)', requisitos: 'No se necesitan conocimientos previos. Traer notebook.', precio_actualizado_en: '2026-09-30',
    horarios: [[1, '18:00', '20:00']],
    modulos: [['Fundamentos y diagnóstico', ['Herramientas del taller', 'Seguridad ESD', 'Apertura segura']], ['Reemplazo de módulos', ['Pantallas', 'Baterías', 'Cámaras']]],
    kit: [['Soldador de punta fina', 'Para microsoldadura', 15000, 'https://example.com/soldador'], ['Estaño y flux', 'Pack de insumos', 6500, 'https://example.com/estano']],
    clases: [[1, '2026-09-14', 'Introducción y herramientas', 'programada'], [2, '2026-09-21', 'Diagnóstico visual', 'suspendida'], [3, '2026-09-28', 'Apertura y desarme', 'programada'], [4, '2026-10-05', 'Reemplazo de pantalla', 'programada'], [5, '2026-10-12', 'Baterías', 'programada'], [6, '2026-10-19', 'Cámaras y flexores', 'programada']] },
  { slug: 'carteles-neon-led', nombre: 'Carteles Neón LED', area: 'diseno', tipo: 'curso', nivel: 'Inicial', cupo: 2, duracion_semanas: 8, precio: 75000, fecha_inicio: '2026-10-07', aula_id: aulas['Aula 2'], profesor_id: ids.profe_b, destacado: true, orden: 2,
    descripcion: 'Diseño y armado de carteles de neón LED. (Curso de prueba, cupo completo a propósito)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[3, '18:00', '20:00']], modulos: [['Diseño del cartel', ['Bocetos', 'Materiales']]], kit: [], clases: [[1, '2026-10-07', 'Introducción al neón LED', 'programada'], [2, '2026-10-14', 'Armado', 'programada']] },
  { slug: 'taller-cambio-de-glass', nombre: 'Taller de Cambio de Glass', area: 'tecnico', tipo: 'taller', nivel: 'Intermedio', cupo: 6, duracion_semanas: 2, precio: 40000, fecha_inicio: '2026-09-05', aula_id: aulas['Aula 3'], profesor_id: ids.profe_a, destacado: false, orden: 3,
    descripcion: 'Taller intensivo de cambio de vidrio en pantallas. (Taller de prueba, ya finalizado)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[6, '10:00', '12:00']], modulos: [], kit: [], clases: [[1, '2026-09-05', 'Separación de glass', 'programada'], [2, '2026-09-12', 'Pegado y curado', 'programada']] },
]

const cid = {}
for (const c of CURSOS) {
  const { horarios, modulos, kit, clases, ...row } = c
  const data = ok(await sb.from('cursos').upsert(row, { onConflict: 'slug' }).select('id').single(), `curso ${c.slug}`)
  cid[c.slug] = data.id
  ok(await sb.from('horarios_curso').delete().eq('curso_id', data.id), 'del horarios')
  for (const [d, a, b] of horarios) ok(await sb.from('horarios_curso').insert({ curso_id: data.id, dia_semana: d, hora_inicio: a, hora_fin: b }), `horario ${c.slug}`)
  ok(await sb.from('modulos_curso').delete().eq('curso_id', data.id), 'del modulos')
  for (const [i, [t, items]] of modulos.entries()) ok(await sb.from('modulos_curso').insert({ curso_id: data.id, orden: i, titulo: t, items }), 'modulo')
  ok(await sb.from('kit_items').delete().eq('curso_id', data.id), 'del kit')
  for (const [i, [n, d, p, l]] of kit.entries()) ok(await sb.from('kit_items').insert({ curso_id: data.id, orden: i, nombre: n, descripcion: d, precio: p, link_externo: l }), 'kit')
  ok(await sb.from('clases').upsert(clases.map(([numero, fecha, titulo, estado]) => ({ curso_id: data.id, numero, fecha, titulo, estado })), { onConflict: 'curso_id,numero' }), `clases ${c.slug}`)
}

// ── 3. Inscripciones (no se borran; se saltea lo que ya existe) ─
const inscribir = async (alumno, slug, patch = {}) => {
  const ex = (await sb.from('inscripciones').select('id, estado').eq('alumno_id', ids[alumno]).eq('curso_id', cid[slug]).maybeSingle()).data
  if (!ex) ok(await sb.from('inscripciones').insert({ alumno_id: ids[alumno], curso_id: cid[slug] }), `insc ${alumno}`)
  const row = ex ?? (await sb.from('inscripciones').select('id, estado').eq('alumno_id', ids[alumno]).eq('curso_id', cid[slug]).single()).data
  if (patch.estado && row.estado === 'activo') ok(await sb.from('inscripciones').update(patch).eq('id', row.id), `estado ${alumno}`)
}
await inscribir('alumno1', 'reparacion-de-celulares')
await inscribir('alumno2', 'reparacion-de-celulares', { estado: 'desertor', fecha_desercion: '2026-09-29', motivo_desercion: 'Cambió de horario laboral (prueba)' })
await inscribir('alumno3', 'reparacion-de-celulares')
await inscribir('alumno1', 'carteles-neon-led')
await inscribir('alumno3', 'carteles-neon-led')
await inscribir('alumno3', 'taller-cambio-de-glass', { estado: 'finalizado' })

// ── 4. Material (PDF real mínimo + links) ──────────────────
const pdf = (t) => { const s = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 56>>stream\nBT /F1 14 Tf 20 70 Td (${t}) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`; return Buffer.from(s) }
const claseId = async (slug, n) => ok(await sb.from('clases').select('id').eq('curso_id', cid[slug]).eq('numero', n).single(), 'clase').id
async function material(slug, titulo, extra, archivo) {
  if ((await sb.from('materiales').select('id').eq('curso_id', cid[slug]).eq('titulo', titulo).maybeSingle()).data) return
  const row = { curso_id: cid[slug], titulo, subido_por: ids.profe_a, ...extra }
  if (archivo) {
    const path = `${cid[slug]}/${randomUUID()}.pdf`
    ok(await sb.storage.from('materiales').upload(path, archivo, { contentType: 'application/pdf' }), `subir ${titulo}`)
    Object.assign(row, { tipo: 'pdf', storage_path: path })
  } else row.tipo = 'link'
  ok(await sb.from('materiales').insert(row), `material ${titulo}`)
}
await material('reparacion-de-celulares', 'Apunte Clase 1 (liberado)', { liberado_manual: true, clase_id: await claseId('reparacion-de-celulares', 1) }, pdf('Apunte clase 1 - prueba'))
await material('reparacion-de-celulares', 'Apunte Clase 6 (oculto)', { liberar_en: '2026-12-01', clase_id: await claseId('reparacion-de-celulares', 6) }, pdf('Apunte clase 6 - OCULTO'))
await material('reparacion-de-celulares', 'Video introductorio (link)', { liberado_manual: true, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
await material('taller-cambio-de-glass', 'Guía de cambio de glass', { liberado_manual: true }, pdf('Guia glass - prueba'))

// ── 5. Encuesta, CMS y ajustes ─────────────────────────────
if (!(await sb.from('encuestas').select('id').eq('titulo', 'Encuesta de fin de curso — Celulares').maybeSingle()).data)
  ok(await sb.from('encuestas').insert({ curso_id: cid['reparacion-de-celulares'], titulo: 'Encuesta de fin de curso — Celulares', preguntas: [{ tipo: 'puntaje', texto: '¿Cómo calificás al profesor?' }, { tipo: 'texto', texto: '¿Qué mejorarías?' }] }), 'encuesta')

const set = (clave, valor) => sb.from('site_settings').upsert({ clave, valor }).then((r) => ok(r, clave))
await set('hero', { titulo: 'Aprendé un oficio con equipos reales', subtitulo: 'Cursos y talleres presenciales de diseño y tecnología en Córdoba. (texto de prueba)', imagen_url: '/images/hero.jpg', cta_cursos: 'Ver cursos', cta_whatsapp: 'WhatsApp' })
await set('areas', { diseno: { titulo: 'Creación y Diseño', texto: 'Estampado, impresión 3D, cartelería y más.', imagen_url: '/images/curso-neon.jpg' }, tecnico: { titulo: 'Reparación y Tecnología', texto: 'Celulares, impresoras, notebooks, PC y televisores.', imagen_url: '/images/curso-iphone.jpg' } })
await set('nosotros', { titulo: 'Formación de taller, no de aula', texto: 'Grupos reducidos, herramientas profesionales y clases 100% prácticas. (texto de prueba)' })
await set('stats', { aulas: 3, profesores: 10, egresados: 0 })
await set('contacto', { direccion: 'La Rioja 345, X5022 Córdoba', telefono: '', email: '', whatsapp: '', instagram: '', horario: '' })
if (!(await sb.from('cms_faq').select('id').limit(1)).data?.length) {
  ok(await sb.from('cms_faq').insert([{ pregunta: '¿Necesito conocimientos previos?', respuesta: 'No, los cursos inicial arrancan desde cero. (prueba)', orden: 1 }, { pregunta: '¿Dónde se cursa?', respuesta: 'Presencial en La Rioja 345, Córdoba.', orden: 2 }]), 'faq')
  ok(await sb.from('cms_testimonios').insert([{ nombre: 'Egresado de prueba', curso: 'Reparación de Celulares', texto: 'Excelente curso, 100% práctico. (testimonio de prueba)', puntaje: 5, orden: 1 }, { nombre: 'Otra egresada de prueba', curso: 'Reparación de Celulares', texto: 'Aprendí mucho. (prueba)', puntaje: 5, curso_id: cid['reparacion-de-celulares'], orden: 2 }]), 'testimonios')
}

// ── Salida ─────────────────────────────────────────────────
const tabla = USUARIOS.map((u) => `${u.rol.padEnd(9)} ${u.email.padEnd(32)} ${u.password}`).join('\n')
console.log(`\nCUENTAS DE PRUEBA (${env.APP_ENV})\n` + tabla)
writeFileSync(process.env.CREDS_OUT ?? '/dev/null', JSON.stringify({ usuarios: USUARIOS, ids, cursos: cid }, null, 2), { mode: 0o600 })
