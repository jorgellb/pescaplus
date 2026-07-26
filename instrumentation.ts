/**
 * Arranque del servidor. Se ejecuta una vez, antes de atender ninguna petición.
 *
 * Lo propio de Node vive en `instrumentation-node.ts` y se carga con un import
 * dinámico: este fichero se compila también para Edge, así que un `node:dns`
 * aquí arriba haría fallar ese bundle aunque nunca llegara a ejecutarse.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node')
  }
}
