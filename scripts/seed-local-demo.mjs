// Seed de demo SOLO para el Supabase LOCAL (supabase start). No tocar contra
// un proyecto real. Crea un admin, un profesor, un alumno matriculado y un
// curso publicado/destacado para poder ver el sitio y el campus con datos.
import { createClient } from '@supabase/supabase-js'

const URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE = process.argv[2]
if (!SERVICE_ROLE) {
  console.error('Uso: node scripts/seed-local-demo.mjs <service_role_key>')
  process.exit(1)
}

const admin = createClient(URL, SERVICE_ROLE)

async function crearUsuario({ email, password, nombre, apellido, rol }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido },
  })
  if (error) throw error
  // createUser() no pasa por el flujo de invitación (invited_at queda null),
  // así que el trigger handle_new_user no toma el rol del metadata — se
  // corrige acá con el cliente admin (auth.uid() es null en esta conexión,
  // el trigger anti-escalación tiene un short-circuit para ese caso).
  const { error: updError } = await admin.from('profiles').update({ rol, cuenta_activa: true }).eq('id', data.user.id)
  if (updError) throw updError
  return data.user.id
}

const adminId = await crearUsuario({ email: 'admin@recoveryparts.local', password: 'demo1234', nombre: 'Admin', apellido: 'Demo', rol: 'administrador' })
const profesorId = await crearUsuario({ email: 'profesor@recoveryparts.local', password: 'demo1234', nombre: 'Diego', apellido: 'Ramírez', rol: 'profesor' })
const alumnoId = await crearUsuario({ email: 'alumno@recoveryparts.local', password: 'demo1234', nombre: 'Lucas', apellido: 'Díaz', rol: 'alumno' })

await admin.from('profiles').update({ bio: 'Técnico especializado en microelectrónica, 8 años de experiencia en el taller.' }).eq('id', profesorId)

const { data: curso, error: cursoError } = await admin
  .from('cursos')
  .insert({
    slug: 'reparacion-de-iphone',
    titulo: 'Reparación de iPhone',
    tipo: 'curso',
    area: 'tecnico',
    descripcion: 'Diagnóstico avanzado, micro-soldadura y reemplazo de componentes a nivel placa.',
    requisitos: 'Conocimientos básicos de electrónica y soldadura.',
    temario: [
      { titulo: 'Fundamentos y Diagnóstico Visual', descripcion: 'Identificación de modelos, herramientas y protocolos ESD.' },
      { titulo: 'Periféricos y Reemplazo Modular', descripcion: 'Batería, cámaras, altavoces y módulos de carga.' },
      { titulo: 'Pantallas y Truetone', descripcion: 'Cambio de glass y OLED sin perder Truetone.' },
      { titulo: 'Introducción a Microelectrónica', descripcion: 'Microsoldadura, reballing y líneas de alimentación.' },
    ],
    imagenes: ['/images/curso-iphone.jpg'],
    dias_semana: [1, 3],
    hora_inicio: '18:00',
    hora_fin: '20:00',
    aula: 'Taller A',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    duracion_semanas: 12,
    profesor_id: profesorId,
    cupo_total: 14,
    precio: 25000,
    kit_items: [{ nombre: 'Kit de soldadura', descripcion: 'Estaño, flux y punta fina', precio: 18000, link: 'https://mundopar.com.ar' }],
    publicado: true,
    destacado: true,
  })
  .select('id')
  .single()
if (cursoError) throw cursoError

await admin.from('matriculas').insert({ alumno_id: alumnoId, curso_id: curso.id, created_by: adminId })

console.log('Listo. Usuarios (contraseña demo1234 para los 3):')
console.log('  admin@recoveryparts.local     -> /admin')
console.log('  profesor@recoveryparts.local  -> /profesor')
console.log('  alumno@recoveryparts.local    -> /alumno')
