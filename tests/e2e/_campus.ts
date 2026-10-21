import { createHmac, randomBytes } from 'node:crypto'
import postgres from 'postgres'

// Fixtures para los E2E del campus: crean usuarios y un curso de prueba directamente en la base (la misma que usa la
// app) y firman la cookie de sesión como lo hace `src/lib/session.ts` (HMAC-SHA256 con SESSION_SECRET).
// Todo lleva un sufijo único y se borra al terminar: los proyectos corren en paralelo sobre la misma base.
export const DATABASE_URL = process.env.DATABASE_URL
export const SESSION_SECRET = process.env.SESSION_SECRET

export function cookieDeSesion(userId: string, segundos = 3600) {
  const iat = Math.floor(Date.now() / 1000)
  const cuerpo = Buffer.from(JSON.stringify({ sub: userId, iat, exp: iat + segundos })).toString('base64url')
  return `${cuerpo}.${createHmac('sha256', SESSION_SECRET!).update(cuerpo).digest('base64url')}`
}

export type Escenario = {
  sufijo: string; sql: postgres.Sql
  admin: string; profesor: string; alumno: string; alumnoAjeno: string
  curso: string; edicion: string; cursoAjeno: string; edicionAjena: string; nombreCurso: string; nombreCursoAjeno: string
  limpiar: () => Promise<void>
}

export async function crearEscenario(proyecto: string): Promise<Escenario> {
  const sql = postgres(DATABASE_URL!, { max: 2, onnotice: () => {} })
  const sufijo = `${proyecto}-${randomBytes(3).toString('hex')}`
  const usuario = async (rol: string, nombre: string, etiqueta = rol) => {
    const [u] = await sql<{ id: string }[]>`
      insert into auth.users (email, raw_user_meta_data, invited_at)
      values (${`e2e-${etiqueta}-${sufijo}@example.test`}, ${sql.json({ rol, nombre, apellido: `E2E ${sufijo}` })}, now()) returning id`
    // El trigger que activa la cuenta corre al CONFIRMAR el email (update), igual que cuando la persona define su contraseña.
    await sql`update auth.users set email_confirmed_at = now() where id = ${u.id}`
    return u.id
  }
  const [admin, profesor, alumno, alumnoAjeno] = [await usuario('admin', 'Admin'), await usuario('profesor', 'Profe'), await usuario('alumno', 'Alumno'), await usuario('alumno', 'Ajeno', 'ajeno')]

  // Dos talleres, cada uno con 3 clases, vigentes (empezaron hace 5 días y terminan en el futuro).
  const taller = async (nombre: string, prof: string | null) => {
    const [c] = await sql<{ id: string }[]>`insert into cursos (slug, nombre, area, tipo) values (${`e2e-${nombre}-${sufijo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')}, ${nombre}, 'tecnico', 'taller') returning id`
    await sql`insert into plan_clases (curso_id, numero, titulo) select ${c.id}, n, ${'Clase '} || n from generate_series(1, 3) n`
    const [e] = await sql<{ id: string }[]>`insert into ediciones (curso_id, cupo, fecha_inicio, profesor_id) values (${c.id}, 10, current_date - 5, ${prof}) returning id`
    await sql`insert into clases (edicion_id, plan_clase_id, fecha)
              select ${e.id}, p.id, current_date + (case p.numero when 1 then -5 when 2 then 3 else 10 end)
              from plan_clases p where p.curso_id = ${c.id}`
    return { curso: c.id, edicion: e.id }
  }
  const nombreCurso = `Taller E2E ${sufijo}`, nombreCursoAjeno = `Taller Ajeno ${sufijo}`
  const propio = await taller(nombreCurso, profesor)
  const ajeno = await taller(nombreCursoAjeno, null)
  await sql`insert into inscripciones (alumno_id, edicion_id) values (${alumno}, ${propio.edicion}), (${alumnoAjeno}, ${ajeno.edicion})`

  return {
    sufijo, sql, admin, profesor, alumno, alumnoAjeno, nombreCurso, nombreCursoAjeno,
    curso: propio.curso, edicion: propio.edicion, cursoAjeno: ajeno.curso, edicionAjena: ajeno.edicion,
    async limpiar() {
      // Las inscripciones no se pueden borrar (trigger): se borran con el curso en cascada desactivando el trigger de la sesión.
      await sql.begin(async (tx) => {
        await tx`set local session_replication_role = replica`
        await tx`delete from inscripciones where edicion_id in (${propio.edicion}, ${ajeno.edicion})`
        await tx`delete from clases where edicion_id in (${propio.edicion}, ${ajeno.edicion})`
        await tx`delete from ediciones where id in (${propio.edicion}, ${ajeno.edicion})`
        await tx`delete from plan_clases where curso_id in (${propio.curso}, ${ajeno.curso})`
        await tx`delete from cursos where id in (${propio.curso}, ${ajeno.curso})`
        await tx`delete from profiles where id in (${admin}, ${profesor}, ${alumno}, ${alumnoAjeno})`
        await tx`delete from auth.users where id in (${admin}, ${profesor}, ${alumno}, ${alumnoAjeno})`
      })
      await sql.end()
    },
  }
}
