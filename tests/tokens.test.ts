import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { secureToken, tokensEqual } from '@/lib/tokens'

/**
 * El token de gestión del patrón es su credencial ÚNICA: con él se edita el
 * perfil, se publican y cancelan salidas, se suben fotos y se conecta Stripe.
 * Se generaba con `Math.random()`, que no es criptográfico — su estado interno
 * se puede reconstruir observando unas pocas salidas.
 *
 * Estas pruebas fijan la propiedad (aleatoriedad del sistema y comparación en
 * tiempo constante), no la implementación concreta.
 */
describe('tokens de acceso', () => {
  it('tiene entropía de sobra y no se repite', () => {
    const n = 500
    const vistos = new Set(Array.from({ length: n }, () => secureToken('op_')))
    expect(vistos.size).toBe(n)
    // 32 bytes en base64url son 43 caracteres.
    for (const t of vistos) expect(t.length).toBe('op_'.length + 43)
  })

  it('respeta el prefijo y es seguro en una URL', () => {
    const t = secureToken('mt_')
    expect(t.startsWith('mt_')).toBe(true)
    expect(encodeURIComponent(t)).toBe(t)
  })

  it('compara sin lanzar ante longitudes distintas o valores vacíos', () => {
    // `timingSafeEqual` lanza si las longitudes no coinciden: si no se
    // comprobara antes, un token corto tumbaría la petición en vez de
    // devolver "no autorizado".
    expect(tokensEqual('abc', 'abcd')).toBe(false)
    expect(tokensEqual('', '')).toBe(false)
    expect(tokensEqual(null, 'x')).toBe(false)
    expect(tokensEqual('x', undefined)).toBe(false)
    const t = secureToken('op_')
    expect(tokensEqual(t, t)).toBe(true)
    expect(tokensEqual(t, secureToken('op_'))).toBe(false)
  })
})

describe('ninguna credencial vuelve a salir de Math.random()', () => {
  // Guardián: comprueba las funciones que ACUÑAN credenciales. Los `mem-...`
  // de los almacenes en memoria pueden seguir usando Math.random porque son
  // identificadores, no secretos.
  it.each([
    ['lib/operators-store.ts', 'op_'],
    ['lib/meetups-store.ts', 'mt_'],
  ])('%s acuña su token con el generador seguro', (fichero, prefijo) => {
    const src = readFileSync(join(process.cwd(), fichero), 'utf8')
    const fn = /function token\(\): string \{([\s\S]*?)\n\}/.exec(src)
    expect(fn, `${fichero} ya no tiene la función token()`).not.toBeNull()
    expect(fn![1]).toContain('secureToken')
    expect(fn![1], `${fichero} vuelve a usar Math.random para una credencial`).not.toContain('Math.random')
    expect(fn![1]).toContain(prefijo)
  })

  it('los tokens de sesión y de enlace mágico también', () => {
    const src = readFileSync(join(process.cwd(), 'lib/auth.ts'), 'utf8')
    expect(src).not.toMatch(/randomId[\s\S]{0,120}Math\.random/)
    expect(src).toContain('secureToken')
  })
})
