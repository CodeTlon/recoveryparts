// Sin `server-only` a propósito: es una función pura, se prueba con node --test (tests/unit).

/**
 * IP del cliente para los límites de intentos, a partir de las cabeceras del request.
 * - `TRUSTED_IP_HEADER` (opcional, ej. `cf-connecting-ip`, `x-real-ip`): la cabecera que el proxy/CDN de este despliegue
 *   fija SIEMPRE por su cuenta. Si está, manda.
 * - Por defecto, el ÚLTIMO valor de `x-forwarded-for`: es el que agrega el proxy más cercano con la IP que vio; los
 *   valores anteriores los puede escribir el cliente. (El primero NO es confiable.)
 * - `x-real-ip` queda como último recurso: si el proxy no lo pisa, el cliente lo puede mandar.
 */
export function ipDeCabeceras(h: Pick<Headers, 'get'>, cabeceraConfiada = process.env.TRUSTED_IP_HEADER) {
  if (cabeceraConfiada) {
    const v = h.get(cabeceraConfiada)?.split(',')[0].trim()
    if (v) return v
  }
  const xff = h.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean)
  if (xff?.length) return xff[xff.length - 1]
  return h.get('x-real-ip')?.trim() || 'local'
}
