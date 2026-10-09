import 'server-only'
import postgres from 'postgres'
import { QB, cargarMeta, rpc as rpcImpl, type Meta, type Run } from './builder'

// Conexión única a Postgres (DATABASE_URL). Se cachea en globalThis para no abrir un pool
// por cada recarga en desarrollo.
const g = globalThis as unknown as { __rpSql?: postgres.Sql; __rpMeta?: Promise<Meta> }

export { dbConfigured } from '@/lib/env'

function conexion(): postgres.Sql {
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL')
  return (g.__rpSql ??= postgres(process.env.DATABASE_URL, { max: 10, onnotice: () => {}, idle_timeout: 30 }))
}

export type Rol = 'anon' | 'authenticated' | 'service_role'

// Cada consulta corre en su transacción con el rol de Postgres y el usuario de la request:
// RLS (auth.uid() lee app.user_id) sigue siendo la segunda barrera de autorización.
function ejecutor(rol: Rol, userId?: string): Run {
  return (text, params) =>
    conexion().begin(async (tx) => {
      await tx`select set_config('role', ${rol}, true), set_config('app.role', ${rol}, true), set_config('app.user_id', ${userId ?? ''}, true)`
      return tx.unsafe(text, params)
    }) as unknown as Promise<any[]>
}

const meta = () => (g.__rpMeta ??= cargarMeta(ejecutor('service_role')).catch((e) => { g.__rpMeta = undefined; throw e }))

export function cliente(rol: Rol, userId?: string) {
  const run = ejecutor(rol, userId)
  return {
    from: (tabla: string) => new QB(tabla, run, meta),
    rpc: (nombre: string, args: Record<string, any> = {}) => rpcImpl(nombre, args, run, meta),
  }
}
export type Cliente = ReturnType<typeof cliente>

// Visitante sin sesión (sitio público: solo vistas y tablas con política para anon).
export const clienteAnon = () => cliente('anon')
// Usuario autenticado: RLS se evalúa con su id.
export const clienteUsuario = (userId: string) => cliente('authenticated', userId)
// Servidor de confianza (se saltea RLS). Solo en server actions / route handlers tras validar el rol.
export const clienteAdmin = () => cliente('service_role')

// SQL directo con rol de servicio, para auth.users / auth.tokens (no expuestos a otros roles).
export async function sqlAdmin<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return ejecutor('service_role')(text, params) as Promise<T[]>
}
