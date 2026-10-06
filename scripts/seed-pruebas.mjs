// Cuentas y datos de PRUEBA para desarrollo (Supabase local) u homologación. Idempotente.
// Uso: ENV_FILE=.env.development node scripts/seed-pruebas.mjs --confirmo-no-produccion
//      ENV_FILE=.env.test     node scripts/seed-pruebas.mjs --confirmo-no-produccion
// Se niega a correr si APP_ENV=production. Emails @homologacion.example.com (fáciles de borrar).
// No envía ningún mail. Las contraseñas se generan al azar y se imprimen al final.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const ENV_FILE = process.env.ENV_FILE ?? '.env.development'
if (!process.argv.includes('--confirmo-no-produccion')) {
  console.error('Este script crea datos de prueba. Corrélo con --confirmo-no-produccion (desarrollo u homologación).')
  process.exit(1)
}

const env = Object.fromEntries(readFileSync(ENV_FILE, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
if (env.APP_ENV === 'production' || !['development', 'test'].includes(env.APP_ENV ?? '')) {
  console.error(`Abortado: ${ENV_FILE} no declara APP_ENV=development|test (APP_ENV=${env.APP_ENV ?? 'sin definir'}).`)
  process.exit(1)
}
console.log(`Entorno: ${env.APP_ENV} → ${env.NEXT_PUBLIC_SUPABASE_URL}`)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const ok = (r, ctx) => { if (r.error) throw new Error(`${ctx}: ${r.error.message}`); return r.data }

const D = '@demo.example.com'
// Cuentas de demo con datos fáciles de dictar (el script se niega a correr fuera de development/test).
const PASSWORD_DEMO = 'demo1234'
const USUARIOS = [
  { key: 'admin', rol: 'admin', nombre: 'Maxi', apellido: 'Escaroni' },
  { key: 'profe1', rol: 'profesor', nombre: 'Pablo', apellido: 'Ledesma' },
  { key: 'profe2', rol: 'profesor', nombre: 'Paula', apellido: 'Sosa' },
  { key: 'alumno1', rol: 'alumno', nombre: 'Lucas', apellido: 'Fernández' },
  { key: 'alumno2', rol: 'alumno', nombre: 'Mariana', apellido: 'Rossi' },
  { key: 'alumno3', rol: 'alumno', nombre: 'Tomás', apellido: 'Villarreal' },
  { key: 'alumno4', rol: 'alumno', nombre: 'Sofía', apellido: 'Argañaraz' },
  { key: 'alumno5', rol: 'alumno', nombre: 'Martín', apellido: 'Quiroga' },
  { key: 'alumno6', rol: 'alumno', nombre: 'Julieta', apellido: 'Montenegro' },
].map((u) => ({ ...u, email: `${u.key}${D}`, password: PASSWORD_DEMO }))

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
ok(await sb.from('profiles').update({ experiencia: 'Técnico con 10 años de experiencia en microelectrónica. (dato de prueba)', certificaciones: 'Curso de microsoldadura (prueba)' }).eq('id', ids.profe1), 'mini-cv')

// ── 2. Cursos ──────────────────────────────────────────────
// RF-03: el cupo de cada curso no puede superar la capacidad de su aula (los cupos de abajo caben).
for (const [nombre, capacidad] of [['Aula 1', 12], ['Aula 2', 10], ['Aula 3', 10]])
  ok(await sb.from('aulas').update({ capacidad }).eq('nombre', nombre), `capacidad ${nombre}`)
const aulas =Object.fromEntries(ok(await sb.from('aulas').select('id, nombre'), 'aulas').map((a) => [a.nombre, a.id]))
// Calendario semanal: n clases desde `inicio`, una por semana.
const semanal = (inicio, n, tema) => Array.from({ length: n }, (_, i) => {
  const d = new Date(`${inicio}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 7 * i)
  return [i + 1, d.toISOString().slice(0, 10), `${tema}: clase ${i + 1}`, 'programada']
})
// Días consecutivos (talleres intensivos): n clases, una por día desde `inicio`.
const consecutivos = (inicio, n, tema) => Array.from({ length: n }, (_, i) => {
  const d = new Date(`${inicio}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i)
  return [i + 1, d.toISOString().slice(0, 10), `${tema}: día ${i + 1}`, 'programada']
})
// Tienda socia (herramientas y repuestos): los kits enlazan a su sitio; la venta no pasa por este sistema.
const MP = 'https://www.mundopartsrepuestos.com/'
// Módulos adicionales de los cursos largos (el plan de estudios completo se carga desde el panel de admin).
const MODULOS_EXTRA = {
  'reparacion-de-celulares': [['Diagnóstico de fallas', ['Método de diagnóstico', 'Uso del multímetro']], ['Pantallas y baterías', ['Cambio de display', 'Cambio de batería']], ['Software', ['Flasheo y desbloqueo', 'Respaldo de datos']], ['Práctica final', ['Reparación de equipos reales']]],
  'reparacion-de-notebooks': [['Software y sistema', ['Instalación de sistemas', 'Diagnóstico de arranque']], ['Mantenimiento', ['Limpieza profunda', 'Cambio de pasta térmica']], ['Práctica final', ['Reparación de equipos reales']]],
  'armado-y-mantenimiento-de-pcs': [['Diagnóstico', ['Fallas de encendido', 'Pruebas de componentes']], ['Redes básicas', ['Conexión y configuración']], ['Práctica final', ['Armado completo de una PC']]],
  'reparacion-de-televisores': [['Audio y video', ['Fallas de imagen', 'Fallas de sonido']], ['Práctica final', ['Reparación de equipos reales']]],
  'reparacion-de-iphone-avanzada': [['Software', ['Restauración y DFU']], ['Práctica final', ['Casos reales de placa']]],
  'impresion-3d-desde-cero': [['Proyecto', ['Diseño de una pieza propia', 'Impresión y terminación']]],
}
const CURSOS = [
  { slug: 'reparacion-de-celulares', imagen_url: '/images/curso-iphone.jpg', nombre: 'Reparación de Celulares', area: 'tecnico', tipo: 'curso', nivel: 'Inicial', cupo: 4, duracion_semanas: 12, precio: 90000, descuento_pct: 10, fecha_inicio: '2026-09-14', aula_id: aulas['Aula 1'], profesor_id: ids.profe1, destacado: true, orden: 1,
    descripcion: 'Aprendé diagnóstico y reparación de celulares desde cero, con equipos reales. (Curso de prueba)', requisitos: 'No se necesitan conocimientos previos. Traer notebook.', precio_actualizado_en: '2026-09-30',
    horarios: [[1, '18:00', '20:00']],
    modulos: [['Fundamentos y diagnóstico', ['Herramientas del taller', 'Seguridad ESD', 'Apertura segura']], ['Reemplazo de módulos', ['Pantallas', 'Baterías', 'Cámaras']]],
    kit: [['Soldador de punta fina', 'Para microsoldadura', 15000, MP], ['Estaño y flux', 'Pack de insumos', 6500, MP]],
    clases: [[1, '2026-09-14', 'Introducción y herramientas', 'programada'], [2, '2026-09-21', 'Diagnóstico visual', 'suspendida'], [3, '2026-09-28', 'Apertura y desarme', 'programada'], [4, '2026-10-05', 'Reemplazo de pantalla', 'programada'], [5, '2026-10-12', 'Baterías', 'programada'], [6, '2026-10-19', 'Cámaras y flexores', 'programada']] },
  { slug: 'carteles-neon-led', imagen_url: '/images/curso-neon.jpg', nombre: 'Carteles Neón LED', area: 'diseno', tipo: 'curso', nivel: 'Inicial', cupo: 2, duracion_semanas: 8, precio: 75000, fecha_inicio: '2026-10-07', aula_id: aulas['Aula 2'], profesor_id: ids.profe2, destacado: true, orden: 2,
    descripcion: 'Diseño y armado de carteles de neón LED. (Curso de prueba, cupo completo a propósito)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[3, '18:00', '20:00']], modulos: [['Diseño del cartel', ['Bocetos', 'Materiales']]], kit: [], clases: [[1, '2026-10-07', 'Introducción al neón LED', 'programada'], [2, '2026-10-14', 'Armado', 'programada']] },
  { slug: 'taller-cambio-de-glass', imagen_url: '/images/curso-glass.jpg', nombre: 'Taller de Cambio de Glass', area: 'tecnico', tipo: 'taller', nivel: 'Intermedio', cupo: 6, duracion_semanas: 2, precio: 40000, fecha_inicio: '2026-09-05', aula_id: aulas['Aula 3'], profesor_id: ids.profe1, destacado: false, orden: 3,
    descripcion: 'Taller intensivo de cambio de vidrio en pantallas. (Taller de prueba, ya finalizado)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[6, '10:00', '12:00']], modulos: [], kit: [], clases: [[1, '2026-09-05', 'Separación de glass', 'programada'], [2, '2026-09-12', 'Pegado y curado', 'programada']] },
  { slug: 'reparacion-de-notebooks', imagen_url: '/images/curso-notebooks.jpg', nombre: 'Reparación de Notebooks', area: 'tecnico', tipo: 'curso', nivel: 'Intermedio', cupo: 8, duracion_semanas: 10, precio: 85000, fecha_inicio: '2026-08-04', aula_id: aulas['Aula 1'], profesor_id: ids.profe2, destacado: true, orden: 4,
    descripcion: 'Diagnóstico, limpieza, cambio de componentes y reparación de placas de notebooks. (Curso de prueba)', requisitos: 'Conocimientos básicos de electrónica.', precio_actualizado_en: '2026-09-30',
    horarios: [[2, '18:00', '20:00']], modulos: [['Hardware de notebooks', ['Desarme y limpieza', 'Cambio de pasta térmica', 'Pantallas y teclados']], ['Placa madre', ['Lectura de fallas', 'Microsoldadura básica']]],
    kit: [['Kit de destornilladores de precisión', 'Para desarme', 9000, MP]], clases: semanal('2026-08-04', 10, 'Notebooks') },
  { slug: 'armado-y-mantenimiento-de-pcs', imagen_url: '/images/curso-computadoras.jpg', nombre: 'Armado y Mantenimiento de PCs', area: 'tecnico', tipo: 'curso', nivel: 'Inicial', cupo: 10, duracion_semanas: 8, precio: 70000, descuento_pct: 15, fecha_inicio: '2026-09-17', aula_id: aulas['Aula 1'], profesor_id: ids.profe1, destacado: true, orden: 5,
    descripcion: 'Armá tu propia computadora, instalá sistemas y aprendé a mantenerla. (Curso de prueba)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[4, '18:00', '20:00']], modulos: [['Armado', ['Componentes', 'Ensamblado', 'Cableado']], ['Software', ['Instalación de sistemas', 'Drivers', 'Optimización']]],
    kit: [], clases: semanal('2026-09-17', 8, 'PCs') },
  { slug: 'estampados-personalizados', imagen_url: '/images/curso-estampados.jpg', nombre: 'Estampados Personalizados', area: 'diseno', tipo: 'curso', nivel: 'Inicial', cupo: 6, duracion_semanas: 6, precio: 60000, fecha_inicio: '2026-11-06', aula_id: aulas['Aula 2'], profesor_id: ids.profe2, orden: 6,
    descripcion: 'Diseño y estampado en remeras, tazas y gorras con técnicas de sublimación. (Curso de prueba, próximo a iniciar)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[5, '18:00', '20:00']], modulos: [['Diseño', ['Bocetos', 'Color y composición']], ['Producción', ['Sublimación', 'Terminaciones']]], kit: [], clases: semanal('2026-11-06', 6, 'Estampados') },
  // Talleres: formatos cortos (3 días seguidos, 2 sábados, una sola jornada).
  { slug: 'taller-intensivo-soldadura-smd', imagen_url: '/images/curso-computadoras.jpg', nombre: 'Taller Intensivo de Soldadura SMD', area: 'tecnico', tipo: 'taller', nivel: 'Intermedio', cupo: 6, duracion_semanas: 1, precio: 45000, fecha_inicio: '2026-10-13', aula_id: aulas['Aula 3'], profesor_id: ids.profe2, destacado: true, orden: 7,
    descripcion: 'Tres días seguidos de práctica intensiva: soldadura de componentes de montaje superficial con estación de aire caliente. (Taller de prueba)', requisitos: 'Haber hecho soldadura básica con estaño.', precio_actualizado_en: '2026-09-30',
    horarios: [[2, '09:00', '13:00'], [3, '09:00', '13:00'], [4, '09:00', '13:00']], modulos: [['Día a día', ['Día 1: herramientas y técnica', 'Día 2: componentes pasivos y QFN', 'Día 3: retrabajo de placas reales']]],
    kit: [['Estación de aire caliente', 'La provee la academia', null, null]], clases: consecutivos('2026-10-13', 3, 'Soldadura SMD') },
  { slug: 'taller-diagnostico-con-multimetro', imagen_url: '/images/about.jpg', nombre: 'Taller de Diagnóstico con Multímetro', area: 'tecnico', tipo: 'taller', nivel: 'Inicial', cupo: 10, duracion_semanas: 2, precio: 30000, fecha_inicio: '2026-10-17', aula_id: aulas['Aula 2'], profesor_id: ids.profe1, orden: 8,
    descripcion: 'Dos sábados para aprender a medir tensión, continuidad y corto en cualquier equipo. (Taller de prueba)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[6, '14:00', '17:00']], modulos: [['Medición', ['Tensión y corriente', 'Continuidad y cortocircuitos']]],
    kit: [['Multímetro digital', 'Se recomienda llevar el propio', 12000, MP]], clases: semanal('2026-10-17', 2, 'Multímetro') },
  { slug: 'taller-express-sublimacion-de-tazas', imagen_url: '/images/curso-estampados.jpg', nombre: 'Taller Express de Sublimación de Tazas', area: 'diseno', tipo: 'taller', nivel: 'Inicial', cupo: 8, duracion_semanas: 1, precio: 18000, fecha_inicio: '2026-11-14', aula_id: aulas['Aula 2'], profesor_id: ids.profe2, orden: 9,
    descripcion: 'En una sola jornada diseñás y sublimás tus propias tazas y te las llevás. (Taller de prueba)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[6, '10:00', '14:00']], modulos: [['La jornada', ['Diseño en plantilla', 'Sublimación y terminación']]],
    kit: [], clases: [[1, '2026-11-14', 'Sublimación de tazas', 'programada']] },
  { slug: 'impresion-3d-desde-cero', imagen_url: '/images/curso-computadoras.jpg', nombre: 'Impresión 3D desde Cero', area: 'diseno', tipo: 'curso', nivel: 'Inicial', cupo: 6, duracion_semanas: 8, precio: 80000, fecha_inicio: '2026-10-20', aula_id: aulas['Aula 3'], profesor_id: ids.profe1, destacado: true, orden: 10,
    descripcion: 'Modelado básico, preparación de archivos y operación de impresoras 3D. Te llevás tus propias piezas. (Curso de prueba)', requisitos: 'Manejo básico de computadora.', precio_actualizado_en: '2026-09-30',
    horarios: [[2, '18:00', '20:00']], modulos: [['Modelado', ['Piezas simples', 'Medidas y tolerancias']], ['Impresión', ['Laminado de archivos', 'Calibración y mantenimiento']]],
    kit: [['Calibre digital', 'Para medir piezas', 8000, MP, false], ['Filamento PLA (1 kg)', 'Para las primeras impresiones', 14000, MP, true]], clases: semanal('2026-10-20', 8, 'Impresión 3D') },
  { slug: 'senaletica-y-carteleria', imagen_url: '/images/curso-neon.jpg', nombre: 'Señalética y Cartelería', area: 'diseno', tipo: 'curso', nivel: 'Intermedio', cupo: 8, duracion_semanas: 6, precio: 65000, fecha_inicio: '2026-10-26', aula_id: aulas['Aula 2'], profesor_id: ids.profe2, orden: 11,
    descripcion: 'Diseño y armado de carteles, vinilos y señalética para comercios. (Curso de prueba)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[1, '14:00', '16:00']], modulos: [['Diseño', ['Tipografía y color', 'Plantillas']], ['Producción', ['Corte de vinilo', 'Montaje']]], kit: [], clases: semanal('2026-10-26', 6, 'Cartelería') },
  { slug: 'reparacion-de-televisores', imagen_url: '/images/curso-notebooks.jpg', nombre: 'Reparación de Televisores', area: 'tecnico', tipo: 'curso', nivel: 'Avanzado', cupo: 6, duracion_semanas: 10, precio: 90000, fecha_inicio: '2026-11-02', aula_id: aulas['Aula 1'], profesor_id: ids.profe1, orden: 12,
    descripcion: 'Diagnóstico y reparación de televisores LED: fuentes, retroiluminación y placas. (Curso de prueba)', requisitos: 'Conocimientos de electrónica básica.', precio_actualizado_en: '2026-09-30',
    horarios: [[1, '10:00', '12:00']], modulos: [['Fuentes', ['Lectura de esquemas', 'Fallas comunes']], ['Pantallas', ['Retroiluminación', 'Placas T-con']]], kit: [['Multímetro', 'Para medir tensión', 12000, MP, true], ['Pinzas de punta fina', 'Recomendadas para trabajar cómodo', 6000, MP, false]], clases: semanal('2026-11-02', 10, 'Televisores') },
  { slug: 'taller-cambio-de-bateria', imagen_url: '/images/curso-iphone.jpg', nombre: 'Taller de Cambio de Batería', area: 'tecnico', tipo: 'taller', nivel: 'Inicial', cupo: 8, duracion_semanas: 1, precio: 25000, fecha_inicio: '2026-11-09', aula_id: aulas['Aula 3'], profesor_id: ids.profe2, orden: 13,
    descripcion: 'En una tarde aprendés a cambiar baterías de celulares de forma segura. (Taller de prueba)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[1, '16:00', '18:00']], modulos: [['La tarde', ['Seguridad', 'Desarme y cambio', 'Prueba final']]], kit: [], clases: [[1, '2026-11-09', 'Cambio de batería', 'programada']] },
  { slug: 'reparacion-de-iphone-avanzada', imagen_url: '/images/curso-iphone.jpg', nombre: 'Reparación de iPhone Avanzada', area: 'tecnico', tipo: 'curso', nivel: 'Avanzado', cupo: 6, duracion_semanas: 10, precio: 110000, fecha_inicio: '2026-11-04', aula_id: aulas['Aula 1'], profesor_id: ids.profe1, destacado: true, orden: 14,
    descripcion: 'Diagnóstico por placa, Face ID, audio y carga en iPhone. Para quienes ya reparan celulares. (Curso de prueba)', requisitos: 'Haber cursado Reparación de Celulares o equivalente.', precio_actualizado_en: '2026-09-30',
    horarios: [[3, '18:00', '20:00']], modulos: [['Diagnóstico', ['Lectura de consumo', 'Fallas de carga']], ['Placa', ['Audio y micrófonos', 'Face ID y sensores']]], kit: [['Fuente de alimentación de laboratorio', 'Se usa la de la academia en clase; recomendada si querés practicar en casa', 60000, MP, false], ['Juego de destornilladores para iPhone', 'Necesario desde la primera clase', 9000, MP, true]], clases: semanal('2026-11-04', 10, 'iPhone') },
  { slug: 'microsoldadura-de-placas', imagen_url: '/images/curso-notebooks.jpg', nombre: 'Microsoldadura de Placas', area: 'tecnico', tipo: 'curso', nivel: 'Avanzado', cupo: 5, duracion_semanas: 8, precio: 95000, fecha_inicio: '2026-11-05', aula_id: aulas['Aula 1'], profesor_id: ids.profe1, orden: 15,
    descripcion: 'Soldadura de componentes diminutos, reballing y reparación de pistas. (Curso de prueba)', requisitos: 'Soldadura básica con estaño.', precio_actualizado_en: '2026-09-30',
    horarios: [[4, '14:00', '16:00']], modulos: [['Técnica', ['Microscopio y herramientas', 'Retrabajo de BGA']], ['Práctica', ['Pistas y vías', 'Placas reales']]], kit: [['Estación de aire caliente', 'Se usa la de la academia', null, null]], clases: semanal('2026-11-05', 8, 'Microsoldadura') },
  { slug: 'electronica-basica', imagen_url: '/images/about.jpg', nombre: 'Electrónica Básica', area: 'tecnico', tipo: 'curso', nivel: 'Inicial', cupo: 12, duracion_semanas: 8, precio: 55000, fecha_inicio: '2026-11-06', aula_id: aulas['Aula 1'], profesor_id: ids.profe1, orden: 16,
    descripcion: 'La base de todo: corriente, tensión, componentes y lectura de circuitos. Ideal para empezar. (Curso de prueba)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[5, '10:00', '12:00']], modulos: [['Fundamentos', ['Tensión, corriente y resistencia', 'Uso del multímetro']], ['Componentes', ['Resistencias y capacitores', 'Diodos y transistores']]], kit: [['Multímetro digital', 'Imprescindible para las clases', 12000, MP, true], ['Protoboard', 'Recomendado para practicar en casa', 5000, MP, false]], clases: semanal('2026-11-06', 8, 'Electrónica') },
  { slug: 'diseno-grafico-para-redes', imagen_url: '/images/curso-estampados.jpg', nombre: 'Diseño Gráfico para Redes', area: 'diseno', tipo: 'curso', nivel: 'Inicial', cupo: 10, duracion_semanas: 6, precio: 50000, fecha_inicio: '2026-11-05', aula_id: aulas['Aula 2'], profesor_id: ids.profe2, orden: 17,
    descripcion: 'Armá piezas para redes sociales de tu emprendimiento: color, tipografía y composición. (Curso de prueba)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[4, '18:00', '20:00']], modulos: [['Bases', ['Composición', 'Color y tipografía']], ['Práctica', ['Posteos y historias', 'Identidad de marca']]], kit: [], clases: semanal('2026-11-05', 6, 'Diseño') },
  { slug: 'taller-fotografia-de-producto', imagen_url: '/images/curso-neon.jpg', nombre: 'Taller de Fotografía de Producto con Celular', area: 'diseno', tipo: 'taller', nivel: 'Inicial', cupo: 10, duracion_semanas: 2, precio: 28000, fecha_inicio: '2026-11-07', aula_id: aulas['Aula 3'], profesor_id: ids.profe2, orden: 18,
    descripcion: 'Dos sábados para sacar fotos profesionales de tus productos usando solo el celular. (Taller de prueba)', requisitos: null, precio_actualizado_en: '2026-09-30',
    horarios: [[6, '14:00', '17:00']], modulos: [['Luz y fondo', ['Iluminación casera', 'Fondos y encuadre']], ['Edición', ['Retoque en el celular']]], kit: [['Trípode para celular', 'Recomendado', 9000, MP, false]], clases: semanal('2026-11-07', 2, 'Fotografía') },
  { slug: 'taller-reparacion-de-consolas', imagen_url: '/images/curso-computadoras.jpg', nombre: 'Taller de Reparación de Consolas', area: 'tecnico', tipo: 'taller', nivel: 'Intermedio', cupo: 6, duracion_semanas: 2, precio: 40000, fecha_inicio: '2026-11-13', aula_id: aulas['Aula 2'], profesor_id: ids.profe2, orden: 19,
    descripcion: 'Dos viernes para diagnosticar y resolver las fallas más comunes de consolas. (Taller de prueba)', requisitos: 'Conocimientos básicos de electrónica.', precio_actualizado_en: '2026-09-30',
    horarios: [[5, '14:00', '17:00']], modulos: [['Fallas comunes', ['Sobrecalentamiento', 'Lectores y puertos']]], kit: [], clases: semanal('2026-11-13', 2, 'Consolas') },
]

// Cada entrada de CURSOS es un curso (catálogo) con su primera edición (fecha, aula, profesor, cupo,
// horarios y calendario). Los títulos de clase van al plan del curso; fechas y estados, a la edición.
const EDICIONES_EXTRA = [
  // Curso recurrente: segunda edición de Celulares, después de que termina la primera (una edición por vez).
  { slug: 'reparacion-de-celulares', clave: 'reparacion-de-celulares#2', fecha_inicio: '2026-11-02', cupo: 8, aula: 'Aula 1', profesor: 'profe1', horarios: [[1, '18:00', '20:00']], semanas: 6 },
]
const cid = {}, eid = {}
async function edicion(curso_id, clave, { fecha_inicio, cupo, aula_id, profesor_id }, horarios, clases) {
  let e = (await sb.from('ediciones').select('id').eq('curso_id', curso_id).eq('fecha_inicio', fecha_inicio).maybeSingle()).data
  if (!e) e = ok(await sb.from('ediciones').insert({ curso_id, fecha_inicio, cupo, aula_id, profesor_id }).select('id').single(), `edición ${clave}`)
  else ok(await sb.from('ediciones').update({ cupo, aula_id, profesor_id }).eq('id', e.id), `edición ${clave}`)
  eid[clave] = e.id
  ok(await sb.from('horarios_curso').delete().eq('edicion_id', e.id), 'del horarios')
  for (const [d, a, b] of horarios) ok(await sb.from('horarios_curso').insert({ edicion_id: e.id, dia_semana: d, hora_inicio: a, hora_fin: b }), `horario ${clave}`)
  ok(await sb.from('clases').upsert(clases.map(([numero, fecha, estado]) => ({ edicion_id: e.id, numero, fecha, estado })), { onConflict: 'edicion_id,numero' }), `clases ${clave}`)
}
for (const c of CURSOS) {
  const { horarios, modulos, kit, clases, cupo, fecha_inicio, aula_id, profesor_id, ...row } = c
  const data = ok(await sb.from('cursos').upsert(row, { onConflict: 'slug' }).select('id').single(), `curso ${c.slug}`)
  cid[c.slug] = data.id
  ok(await sb.from('modulos_curso').delete().eq('curso_id', data.id), 'del modulos')
  for (const [i, [t, items]] of [...modulos, ...(MODULOS_EXTRA[c.slug] ?? [])].entries()) ok(await sb.from('modulos_curso').insert({ curso_id: data.id, orden: i, titulo: t, items }), 'modulo')
  ok(await sb.from('kit_items').delete().eq('curso_id', data.id), 'del kit')
  for (const [i, [n, d, p, l, req]] of kit.entries()) ok(await sb.from('kit_items').insert({ curso_id: data.id, orden: i, nombre: n, descripcion: d, precio: p, link_externo: l, requerido: req !== false }), 'kit')
  ok(await sb.from('plan_clases').upsert(clases.map(([numero, , titulo]) => ({ curso_id: data.id, numero, titulo })), { onConflict: 'curso_id,numero' }), `plan ${c.slug}`)
  await edicion(data.id, c.slug, { fecha_inicio, cupo, aula_id, profesor_id }, horarios, clases.map(([n, f, , e]) => [n, f, e]))
}
for (const x of EDICIONES_EXTRA) {
  const fechas = semanal(x.fecha_inicio, x.semanas, '').map(([n, f]) => [n, f, 'programada'])
  await edicion(cid[x.slug], x.clave, { fecha_inicio: x.fecha_inicio, cupo: x.cupo, aula_id: aulas[x.aula], profesor_id: ids[x.profesor] }, x.horarios, fechas)
}

// ── 3. Inscripciones por edición (no se borran; se saltea lo que ya existe) ─
const inscribir = async (alumno, clave, patch = {}) => {
  const ex = (await sb.from('inscripciones').select('id, estado').eq('alumno_id', ids[alumno]).eq('edicion_id', eid[clave]).maybeSingle()).data
  if (!ex) ok(await sb.from('inscripciones').insert({ alumno_id: ids[alumno], edicion_id: eid[clave] }), `insc ${alumno}`)
  const row = ex ?? (await sb.from('inscripciones').select('id, estado').eq('alumno_id', ids[alumno]).eq('edicion_id', eid[clave]).single()).data
  if (patch.estado && row.estado === 'activo') ok(await sb.from('inscripciones').update(patch).eq('id', row.id), `estado ${alumno}`)
}
await inscribir('alumno1', 'reparacion-de-celulares')
await inscribir('alumno2', 'reparacion-de-celulares', { estado: 'desertor', fecha_desercion: '2026-09-29', motivo_desercion: 'Cambió de horario laboral (prueba)' })
await inscribir('alumno3', 'reparacion-de-celulares')
await inscribir('alumno1', 'carteles-neon-led')
await inscribir('alumno3', 'carteles-neon-led')
await inscribir('alumno3', 'taller-cambio-de-glass', { estado: 'finalizado' })
await inscribir('alumno4', 'taller-cambio-de-glass', { estado: 'finalizado' })
await inscribir('alumno5', 'taller-cambio-de-glass', { estado: 'finalizado' })
await inscribir('alumno1', 'reparacion-de-notebooks')
await inscribir('alumno4', 'reparacion-de-notebooks')
await inscribir('alumno5', 'reparacion-de-notebooks')
await inscribir('alumno6', 'reparacion-de-notebooks', { estado: 'desertor', fecha_desercion: '2026-09-15', motivo_desercion: 'Problemas de salud (prueba)' })
await inscribir('alumno2', 'reparacion-de-notebooks', { estado: 'desertor', fecha_desercion: '2026-08-25', motivo_desercion: 'No le alcanzó el tiempo (prueba)' })
await inscribir('alumno2', 'armado-y-mantenimiento-de-pcs')
await inscribir('alumno4', 'armado-y-mantenimiento-de-pcs')
await inscribir('alumno6', 'armado-y-mantenimiento-de-pcs')
await inscribir('alumno5', 'estampados-personalizados')
await inscribir('alumno1', 'taller-intensivo-soldadura-smd')
await inscribir('alumno4', 'taller-intensivo-soldadura-smd')
await inscribir('alumno3', 'taller-diagnostico-con-multimetro')
await inscribir('alumno6', 'taller-diagnostico-con-multimetro')
await inscribir('alumno2', 'taller-diagnostico-con-multimetro')
await inscribir('alumno5', 'taller-express-sublimacion-de-tazas')
await inscribir('alumno2', 'impresion-3d-desde-cero')
await inscribir('alumno6', 'impresion-3d-desde-cero')
await inscribir('alumno3', 'senaletica-y-carteleria')
await inscribir('alumno4', 'reparacion-de-televisores')
await inscribir('alumno1', 'taller-cambio-de-bateria')
await inscribir('alumno3', 'electronica-basica')
await inscribir('alumno5', 'electronica-basica')
await inscribir('alumno6', 'diseno-grafico-para-redes')
await inscribir('alumno2', 'reparacion-de-iphone-avanzada')
// Mariana desertó de la primera edición de Celulares y retoma en la segunda; Martín se suma a la segunda.
await inscribir('alumno2', 'reparacion-de-celulares#2')
await inscribir('alumno5', 'reparacion-de-celulares#2')

// ── 4. Material del curso por N° de clase (PDF real mínimo + links); liberación por edición ─
const pdf = (t) => { const s = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 56>>stream\nBT /F1 14 Tf 20 70 Td (${t}) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`; return Buffer.from(s) }
// `liberarEn`: ediciones donde se libera a mano (el material de una clase también se libera solo al llegar su fecha).
async function material(slug, titulo, extra, archivo, liberarEn = []) {
  let m = (await sb.from('materiales').select('id').eq('curso_id', cid[slug]).eq('titulo', titulo).maybeSingle()).data
  if (!m) {
    const row = { curso_id: cid[slug], titulo, subido_por: ids.profe1, ...extra }
    if (archivo) {
      const path = `${cid[slug]}/${randomUUID()}.pdf`
      ok(await sb.storage.from('materiales').upload(path, archivo, { contentType: 'application/pdf' }), `subir ${titulo}`)
      Object.assign(row, { tipo: 'pdf', storage_path: path })
    } else row.tipo = 'link'
    m = ok(await sb.from('materiales').insert(row).select('id').single(), `material ${titulo}`)
  }
  for (const clave of liberarEn) ok(await sb.from('materiales_liberados').upsert({ edicion_id: eid[clave], material_id: m.id }, { onConflict: 'edicion_id,material_id' }), `liberar ${titulo}`)
}
await material('reparacion-de-celulares', 'Apunte Clase 1', { clase_numero: 1 }, pdf('Apunte clase 1 - prueba'))
await material('reparacion-de-celulares', 'Apunte Clase 6', { clase_numero: 6 }, pdf('Apunte clase 6 - prueba'))
await material('reparacion-de-celulares', 'Video introductorio (link)', { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, null, ['reparacion-de-celulares'])
await material('reparacion-de-notebooks', 'Guía de desarme de notebooks', { clase_numero: 1 }, pdf('Guia notebooks - prueba'))
await material('armado-y-mantenimiento-de-pcs', 'Checklist de armado', {}, pdf('Checklist armado PC - prueba'), ['armado-y-mantenimiento-de-pcs'])
await material('taller-cambio-de-glass', 'Guía de cambio de glass', {}, pdf('Guia glass - prueba'), ['taller-cambio-de-glass'])

// ── 5. Encuesta (por edición), CMS y ajustes ───────────────
if (!(await sb.from('encuestas').select('id').eq('titulo', 'Encuesta de fin de curso — Celulares').maybeSingle()).data)
  ok(await sb.from('encuestas').insert({ edicion_id: eid['reparacion-de-celulares'], titulo: 'Encuesta de fin de curso — Celulares', preguntas: [{ tipo: 'puntaje', texto: '¿Cómo calificás al profesor?' }, { tipo: 'texto', texto: '¿Qué mejorarías?' }] }), 'encuesta')

const set = (clave, valor) => sb.from('site_settings').upsert({ clave, valor }).then((r) => ok(r, clave))
await set('hero', { titulo: 'Aprendé un oficio con equipos reales', subtitulo: 'Cursos y talleres presenciales de diseño y tecnología en Córdoba. (texto de prueba)', imagen_url: '/images/hero.jpg', cta_cursos: 'Ver cursos', cta_whatsapp: 'WhatsApp' })
await set('areas', { diseno: { titulo: 'Creación y Diseño', texto: 'Estampado, impresión 3D, cartelería y más.', imagen_url: '/images/curso-neon.jpg' }, tecnico: { titulo: 'Reparación y Tecnología', texto: 'Celulares, impresoras, notebooks, PC y televisores.', imagen_url: '/images/curso-iphone.jpg' } })
await set('nosotros', { titulo: 'Formación de taller, no de aula', texto: 'Grupos reducidos, herramientas profesionales y clases 100% prácticas. (texto de prueba)' })
await set('stats', { aulas: 3, profesores: 10, egresados: 0 })
await set('contacto', { direccion: 'La Rioja 345, X5022 Córdoba', telefono: '351 000 0000', email: 'contacto@recoveryparts.example.com', whatsapp: '5493510000000', instagram: '@recoverypartsacademy', horario: 'Lunes a viernes de 9 a 19 h · Sábados de 9 a 14 h' })

// Contenido del sitio (testimonios, FAQ, egresados, galería): solo existe en dev/test, así que se rehace entero
// en cada corrida para que el seed sea repetible sin duplicar.
const limpiar = (t) => sb.from(t).delete().not('id', 'is', null).then((r) => ok(r, 'limpiar ' + t))
for (const t of ['cms_faq', 'cms_testimonios', 'cms_egresados', 'cms_galeria']) await limpiar(t)

ok(await sb.from('cms_faq').insert([
  ['¿Necesito conocimientos previos?', 'No. Los cursos de nivel Inicial arrancan desde cero. En los de nivel Intermedio o Avanzado te contamos antes qué base se necesita.'],
  ['¿Dónde se cursa?', 'Las clases son presenciales, en La Rioja 345, Córdoba. No ofrecemos cursos virtuales.'],
  ['¿Qué diferencia hay entre un curso y un taller?', 'Los cursos duran varias semanas y siguen un plan de estudios. Los talleres son cortos: una jornada, tres días seguidos o una o dos semanas, para aprender algo puntual.'],
  ['¿Cómo me inscribo?', 'Escribinos desde la página de contacto o por WhatsApp y te contamos los pasos y los cupos disponibles.'],
  ['¿Qué incluye cada curso?', 'Clases prácticas con equipos reales, material de estudio en PDF dentro del campus virtual y, en algunos casos, un kit sugerido de herramientas.'],
  ['¿Cómo accedo al material de las clases?', 'Cuando te sumás a un curso recibís una invitación por mail para crear tu contraseña. Desde el campus ves y descargás los PDFs que tu profesor va liberando.'],
  ['¿Los grupos son reducidos?', 'Sí. Cada curso tiene un cupo máximo para que el profesor pueda acompañar a cada alumno.'],
  ['¿Puedo consultar el precio?', 'Cada curso muestra un precio de referencia. Para consultar el valor vigente, escribinos.'],
].map(([pregunta, respuesta], i) => ({ pregunta, respuesta: respuesta + ' (prueba)', orden: i + 1 }))), 'faq')

const T = (nombre, curso, texto, puntaje, slug) => ({ nombre, curso, texto: texto + ' (testimonio de prueba)', puntaje, curso_id: slug ? cid[slug] : null })
ok(await sb.from('cms_testimonios').insert([
  T('Lucas F.', 'Reparación de Celulares', 'Salí del curso reparando mis primeros equipos. Todo es práctica con herramientas reales.', 5),
  T('Mariana R.', 'Estampados Personalizados', 'Los grupos chicos hacen que el profe te corrija en el momento. Muy recomendable.', 5),
  T('Tomás V.', 'Armado y Mantenimiento de PCs', 'Armé mi propia computadora en las clases. Explican todo con paciencia.', 4),
  T('Sofía A.', 'Impresión 3D desde Cero', 'Nunca había tocado una impresora 3D y a la tercera clase ya imprimía mis piezas.', 5),
  T('Martín Q.', 'Taller de Cambio de Glass', 'El taller corto es ideal si ya sabés lo básico y querés un oficio puntual.', 5),
  T('Julieta M.', 'Señalética y Cartelería', 'Aprendí a armar carteles para el negocio de mi familia. Material claro en el campus.', 4),
  T('Carlos P.', 'Reparación de Notebooks', 'El plan de estudios está muy bien armado y los PDFs me sirven para repasar.', 5, 'reparacion-de-notebooks'),
  T('Ana G.', 'Reparación de Celulares', 'Clases ordenadas y siempre con equipos para practicar.', 5, 'reparacion-de-celulares'),
  T('Diego S.', 'Armado y Mantenimiento de PCs', 'Cursé de noche y pude combinarlo con el trabajo.', 4, 'armado-y-mantenimiento-de-pcs'),
].map((t, i) => ({ ...t, orden: i + 1 }))), 'testimonios')

const ESP = ['Reparación de celulares', 'Reparación de notebooks', 'Estampados', 'Cartelería', 'Impresión 3D', 'Armado de PCs']
const NOM = ['Lucas Fernández', 'Mariana Rossi', 'Tomás Villarreal', 'Sofía Argañaraz', 'Martín Quiroga', 'Julieta Montenegro', 'Carlos Paz', 'Ana Giménez']
ok(await sb.from('cms_egresados').insert(NOM.map((nombre, i) => ({ nombre, especialidad: ESP[i % ESP.length], foto_url: `/images/egresado-${i + 1}.jpg`, destacado: i < 4, orden: i + 1 }))), 'egresados')
await set('stats', { aulas: 3, profesores: 10, egresados: 750 })

const G = [
  ['aulas', 'tecnico', '/images/about.jpg', 'Aula de práctica con equipos reales'],
  ['clases', 'tecnico', '/images/curso-iphone.jpg', 'Clase de reparación de celulares'],
  ['clases', 'diseno', '/images/curso-estampados.jpg', 'Taller de estampados'],
  ['trabajos', 'diseno', '/images/curso-neon.jpg', 'Cartel de neón LED terminado'],
  ['trabajos', 'tecnico', '/images/curso-notebooks.jpg', 'Notebook reparada por un alumno'],
  ['trabajos', 'tecnico', '/images/curso-computadoras.jpg', 'Computadora armada en el curso'],
  ['egresados', 'tecnico', '/images/egresados.jpg', 'Egresados de la academia'],
  ['eventos', 'tecnico', '/images/curso-glass.jpg', 'Taller de cambio de glass'],
]
ok(await sb.from('cms_galeria').insert(G.map(([categoria, area, imagen_url, alt], i) => ({ categoria, area, imagen_url, alt, descripcion: alt, orden: i + 1 }))), 'galeria')

// ── Salida ─────────────────────────────────────────────────
const tabla = USUARIOS.map((u) => `${u.rol.padEnd(9)} ${u.email.padEnd(32)} ${u.password}`).join('\n')
console.log(`\nCUENTAS DE PRUEBA (${env.APP_ENV})\n` + tabla)
writeFileSync(process.env.CREDS_OUT ?? '/dev/null', JSON.stringify({ usuarios: USUARIOS, ids, cursos: cid, ediciones: eid }, null, 2), { mode: 0o600 })
