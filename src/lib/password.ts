// Mínimo 8 caracteres y no estar en una lista de contraseñas filtradas comunes.

const COMUNES = new Set(['12345678', '123456789', '1234567890', 'password', 'password1', 'qwertyui', 'qwerty123', 'abc12345', '11111111', 'iloveyou', 'contraseña', 'contrasena', 'recoveryparts', 'admin1234', 'demo1234', '00000000', '87654321', 'asdfghjk', 'unodostres'])

export function validarPassword(p: string): string | null {
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (COMUNES.has(p.toLowerCase())) return 'Esa contraseña es demasiado común. Elegí otra.'
  return null
}
