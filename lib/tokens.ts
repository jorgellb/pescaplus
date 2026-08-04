import crypto from 'crypto'

/**
 * Tokens de acceso: generación y comparación.
 *
 * Existe porque el proyecto tenía las dos cosas hechas de dos maneras. La
 * autenticación de usuarios ya usaba `crypto.randomBytes` (bien), pero los
 * tokens de gestión del patrón y de las quedadas salían de `Math.random()`:
 *
 *     `op_${Math.random().toString(36).slice(2)}${Math.random()...}`
 *
 * `Math.random()` NO es criptográfico. Es un generador pseudoaleatorio cuyo
 * estado interno se puede reconstruir observando unas pocas salidas, así que
 * quien vea suficientes valores derivados del mismo proceso puede predecir los
 * siguientes. Y ese token es la credencial ÚNICA del patrón: con él se edita el
 * perfil, se publican y cancelan salidas, se suben fotos y se conecta Stripe.
 *
 * Los tokens ya emitidos siguen siendo válidos —se comparan con lo guardado en
 * la base de datos, no con un formato— así que esto no echa a nadie fuera; a
 * partir de ahora los nuevos son seguros.
 */

/** 32 bytes del generador del sistema: 256 bits, en base64url (seguro en URLs). */
export function secureToken(prefix = ''): string {
  return `${prefix}${crypto.randomBytes(32).toString('base64url')}`
}

/**
 * Compara dos tokens en tiempo constante.
 *
 * Con `===`, el tiempo de comparación depende de cuántos caracteres coinciden al
 * principio. Por red es impracticable de explotar, pero cuesta lo mismo hacerlo
 * bien, y `timingSafeEqual` exige además que las longitudes coincidan — de ahí
 * la comprobación previa, porque si no lanza en vez de devolver false.
 */
export function tokensEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}
