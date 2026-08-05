import { describe, it, expect, afterEach, vi } from 'vitest'

/**
 * La sesión del panel de administración.
 *
 * Antes la firma era `HMAC(secreto, contraseña)`: un valor CONSTANTE, sin
 * caducidad ni forma de revocarlo. Una cookie filtrada valía para siempre y
 * «cerrar sesión» solo la borraba del navegador.
 *
 * El módulo lee las variables de entorno al importarse, así que cada bloque las
 * fija ANTES de importar y se reinicia el registro de módulos entre pruebas.
 */
async function cargar(env: Record<string, string | undefined>) {
  const previo = { ...process.env }
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  vi.resetModules()
  const mod = await import('@/lib/admin-auth')
  return { mod, restaurar: () => { process.env = previo } }
}

const restauradores: (() => void)[] = []
afterEach(() => { restauradores.splice(0).forEach((f) => f()) })

describe('sesión de admin', () => {
  it('la firma caduca, y una vieja deja de valer', async () => {
    const { mod, restaurar } = await cargar({
      NODE_ENV: 'test', ADMIN_PASSWORD: 'secreta', ADMIN_SESSION_SECRET: 'firma-larga',
    })
    restauradores.push(restaurar)

    expect(mod.isValidSession(mod.sessionToken())).toBe(true)

    const casiCaducada = Date.now() - mod.SESSION_TTL_MS + 60_000
    expect(mod.isValidSession(mod.sessionToken(casiCaducada))).toBe(true)

    const caducada = Date.now() - mod.SESSION_TTL_MS - 1000
    expect(mod.isValidSession(mod.sessionToken(caducada))).toBe(false)
  })

  it('rechaza firmas manipuladas y fechas del futuro', async () => {
    const { mod, restaurar } = await cargar({
      NODE_ENV: 'test', ADMIN_PASSWORD: 'secreta', ADMIN_SESSION_SECRET: 'firma-larga',
    })
    restauradores.push(restaurar)

    const bueno = mod.sessionToken()
    const [emitida, firma] = bueno.split('.')

    expect(mod.isValidSession(undefined)).toBe(false)
    expect(mod.isValidSession('')).toBe(false)
    expect(mod.isValidSession('sinpunto')).toBe(false)
    expect(mod.isValidSession(`${emitida}.${firma.slice(0, -1)}x`)).toBe(false)
    // Adelantar la fecha para estirar la sesión invalida la firma.
    expect(mod.isValidSession(`${Number(emitida) + 999_999}.${firma}`)).toBe(false)
    // Una fecha por delante del reloj no vale ni con firma buena.
    const futuro = Date.now() + 60 * 60 * 1000
    expect(mod.isValidSession(mod.sessionToken(futuro))).toBe(false)
  })

  it('cambiar el secreto invalida todas las sesiones abiertas', async () => {
    // Es la única forma de revocar sin guardar sesiones en la base de datos.
    const a = await cargar({ NODE_ENV: 'test', ADMIN_PASSWORD: 'secreta', ADMIN_SESSION_SECRET: 'uno' })
    restauradores.push(a.restaurar)
    const token = a.mod.sessionToken()
    expect(a.mod.isValidSession(token)).toBe(true)

    const b = await cargar({ NODE_ENV: 'test', ADMIN_PASSWORD: 'secreta', ADMIN_SESSION_SECRET: 'dos' })
    restauradores.push(b.restaurar)
    expect(b.mod.isValidSession(token)).toBe(false)
  })

  it('en producción sin secretos definidos, el panel NO se abre', async () => {
    // Los valores por defecto están en un repositorio público: con ellos,
    // cualquiera podría calcular una cookie válida. Un aviso en pantalla no es
    // un control, así que aquí se deniega de verdad.
    const { mod, restaurar } = await cargar({
      NODE_ENV: 'production', ADMIN_PASSWORD: undefined, ADMIN_SESSION_SECRET: undefined,
    })
    restauradores.push(restaurar)

    expect(mod.insecureDefaultsInProduction()).toBe(true)
    expect(mod.verifyPassword('pescaplus-admin')).toBe(false)
    expect(mod.isValidSession(mod.sessionToken())).toBe(false)
  })

  it('en producción con secretos definidos, funciona con normalidad', async () => {
    const { mod, restaurar } = await cargar({
      NODE_ENV: 'production', ADMIN_PASSWORD: 'la-buena', ADMIN_SESSION_SECRET: 'firma-larga',
    })
    restauradores.push(restaurar)

    expect(mod.insecureDefaultsInProduction()).toBe(false)
    expect(mod.verifyPassword('la-buena')).toBe(true)
    expect(mod.verifyPassword('otra')).toBe(false)
    expect(mod.isValidSession(mod.sessionToken())).toBe(true)
  })

  it('en desarrollo sigue abriéndose con la contraseña por defecto', async () => {
    const { mod, restaurar } = await cargar({
      NODE_ENV: 'development', ADMIN_PASSWORD: undefined, ADMIN_SESSION_SECRET: undefined,
    })
    restauradores.push(restaurar)

    expect(mod.isUsingDefaultPassword()).toBe(true)
    expect(mod.verifyPassword('pescaplus-admin')).toBe(true)
    expect(mod.isValidSession(mod.sessionToken())).toBe(true)
  })
})
