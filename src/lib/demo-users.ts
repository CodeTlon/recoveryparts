// Usuarios mock de la demo. Credenciales a la vista para el Loom.
// ponytail: hardcodeado a propósito — no hay auth real.
export type Role = 'admin' | 'profesor' | 'alumno'

export const USERS: { role: Role; label: string; name: string; email: string; password: string }[] = [
  { role: 'admin',    label: 'Administrador', name: 'Maxi Escaroni', email: 'admin@recoveryparts.com.ar',  password: 'demo1234' },
  { role: 'profesor', label: 'Profesor',      name: 'Diego Ramírez', email: 'profe@recoveryparts.com.ar',  password: 'demo1234' },
  { role: 'alumno',   label: 'Alumno',        name: 'Lucas Díaz',    email: 'alumno@recoveryparts.com.ar', password: 'demo1234' },
]

export const userByRole = (r: Role) => USERS.find((u) => u.role === r)!
export const roleByEmail = (e: string): Role => USERS.find((u) => u.email === e.trim().toLowerCase())?.role ?? 'alumno'
