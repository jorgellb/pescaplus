import crypto from 'crypto'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { tokensEqual } from '@/lib/tokens'

/**
 * Puerta de contraseña del panel de administración.
 *
 * La cookie NO guarda la contraseña: guarda una firma. Antes esa firma era
 * `HMAC(secreto, contraseña)`, un valor CONSTANTE, y de ahí salieron dos
 * hallazgos de la auditoría:
 *
 *  - No caducaba nunca. Una cookie filtrada valía para siempre.
 *  - No se podía revocar. «Cerrar sesión» solo la borraba del navegador; quien
 *    tuviera una copia seguía dentro.
 *
 * Ahora la firma lleva dentro el instante de emisión —`<emitida>.<firma>`, con
 * la firma cubriendo contraseña + instante—, así que caduca sola a los 7 días
 * sin necesidad de guardar sesiones en la base de datos. Para echar a todo el
 * mundo de golpe basta con cambiar `ADMIN_SESSION_SECRET` o la contraseña: las
 * firmas anteriores dejan de validar en el acto.
 */

export const ADMIN_COOKIE = 'pescaplus_admin'
const DEFAULT_DEV_PASSWORD = 'pescaplus-admin'
const DEFAULT_DEV_SECRET = 'pescaplus-admin-session'
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? DEFAULT_DEV_SECRET

/** Vida de la sesión. Debe coincidir con el `maxAge` de la cookie. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_DEV_PASSWORD
}

/** True cuando no hay ADMIN_PASSWORD y se usa la de desarrollo. */
export function isUsingDefaultPassword(): boolean {
  return !process.env.ADMIN_PASSWORD
}

/**
 * True si en PRODUCCIÓN se está tirando de algún valor por defecto.
 *
 * Importa porque los dos por defecto están escritos en un repositorio público:
 * con los dos puestos, cualquiera que lo lea puede calcular una cookie válida y
 * entrar. No es un aviso decorativo — `verifyPassword` e `isValidSession` se
 * niegan a autenticar en ese caso.
 */
export function insecureDefaultsInProduction(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET)
  )
}

export function verifyPassword(password: string): boolean {
  // Con valores por defecto en producción el panel NO se abre. Antes solo se
  // pintaba un aviso en la interfaz, y un aviso no es un control: si alguien
  // despliega sin definir las variables, el panel queda abierto a cualquiera
  // que haya leído el repositorio.
  if (insecureDefaultsInProduction()) return false
  return tokensEqual(password, getAdminPassword())
}

function sign(issuedAt: number): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(`${getAdminPassword()}.${issuedAt}`).digest('hex')
}

/** Nueva firma de sesión, marcada con el instante de emisión. */
export function sessionToken(now = Date.now()): string {
  return `${now}.${sign(now)}`
}

/** Comprueba firma y antigüedad. Cualquier cosa rara, fuera. */
export function isValidSession(value: string | undefined): boolean {
  if (!value) return false
  if (insecureDefaultsInProduction()) return false
  const corte = value.indexOf('.')
  if (corte < 1) return false
  const emitida = Number(value.slice(0, corte))
  if (!Number.isFinite(emitida)) return false
  // Una fecha por delante del reloj significa manipulación o reloj movido.
  const edad = Date.now() - emitida
  if (edad < 0 || edad > SESSION_TTL_MS) return false
  return tokensEqual(value.slice(corte + 1), sign(emitida))
}

/** Comprobación para componentes y acciones de servidor. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies()
  return isValidSession(store.get(ADMIN_COOKIE)?.value)
}

/** Comprobación para manejadores de ruta (lee la cookie de la petición). */
export function isRequestAuthenticated(request: NextRequest): boolean {
  return isValidSession(request.cookies.get(ADMIN_COOKIE)?.value)
}
