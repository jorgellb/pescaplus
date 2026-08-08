/**
 * Avisar de un uso de herramienta desde el navegador.
 *
 * Envolver `window.pp` en vez de llamarlo suelto por ahí sirve para tres cosas:
 * que el nombre del evento salga de una lista y no de una cadena escrita a mano
 * en cada sitio —dos herramientas llamadas «carta» y «Carta» son dos filas
 * distintas en el panel y nadie se entera—, que no haya que comprobar
 * `typeof window` en cada llamada, y que si mañana cambia el transporte se
 * cambie aquí.
 *
 * `window.pp` solo existe cuando `components/Analitica.tsx` ya se ha montado. Si
 * se llama antes, no pasa nada: el evento se pierde y la herramienta funciona
 * igual. Es a propósito — medir nunca puede ser un requisito para usar el sitio.
 */
export type Herramienta =
  | 'aqui'
  | 'carta'
  | 'mejores-horas'
  | 'calendario'
  | 'donde-pescar'
  | 'chat'
  | 'diario'
  | 'quedadas'

export function medirHerramienta(nombre: Herramienta, meta?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  window.pp?.('herramienta', nombre, undefined, meta)
}
