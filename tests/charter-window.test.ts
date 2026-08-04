import { describe, it, expect } from 'vitest'
import { charterWindow, bestSpotToday, ZONAS_CHARTER } from '@/lib/charter-window'
import { getSpot } from '@/lib/fishing-spots'

describe('ventana de pesca de una salida', () => {
  it('devuelve null para una zona que no existe, sin lanzar', () => {
    expect(charterWindow('zona-inventada', '2026-08-10')).toBeNull()
  })

  it('describe el día con valoración, etiqueta y mejor tramo', () => {
    const w = charterWindow('tarifa', '2026-08-10')!
    expect(w).not.toBeNull()
    expect(w.rating).toBeGreaterThanOrEqual(1)
    expect(w.rating).toBeLessThanOrEqual(5)
    expect(w.label).not.toBe('')
    expect(w.best).toMatch(/^\d{2}:\d{2}–\d{2}:\d{2}$/)
  })

  it('todas las fracciones caen dentro del día [0..1]', () => {
    const w = charterWindow('a-coruna', '2026-09-02')!
    for (const p of w.periods) {
      expect(p.from).toBeGreaterThanOrEqual(0)
      expect(p.from).toBeLessThanOrEqual(1)
      expect(p.to).toBeGreaterThanOrEqual(0)
      expect(p.to).toBeLessThanOrEqual(1)
    }
    expect(w.daylight!.from).toBeLessThan(w.daylight!.to)
  })

  /**
   * En España amanece bastante después de medianoche y anochece bastante antes,
   * así que la franja de luz tiene que quedar holgadamente dentro del día. Si
   * alguien vuelve a calcular las fracciones sobre medianoche UTC en vez de hora
   * local, esto se desplaza una o dos horas y salta aquí.
   */
  it('la franja de luz está en horas creíbles, no desplazada por la zona horaria', () => {
    const agosto = charterWindow('tarifa', '2026-08-10')!
    const amanece = agosto.daylight!.from * 24
    const anochece = agosto.daylight!.to * 24
    expect(amanece).toBeGreaterThan(5)
    expect(amanece).toBeLessThan(9)
    expect(anochece).toBeGreaterThan(19)
    expect(anochece).toBeLessThan(23)
  })

  it('un periodo puede cruzar la medianoche, y se marca con from > to', () => {
    // No todos los días lo tienen, así que se buscan varios: lo que se comprueba
    // es que cuando pasa, los valores siguen siendo fracciones válidas — el
    // componente los parte en dos tramos para poder dibujarlos.
    const dias = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14']
    const cruces = dias
      .map((d) => charterWindow('tarifa', d)!)
      .flatMap((w) => w.periods)
      .filter((p) => p.from > p.to)
    for (const p of cruces) {
      expect(p.from).toBeLessThanOrEqual(1)
      expect(p.to).toBeGreaterThanOrEqual(0)
    }
  })

  it('la luna va de 0 a 1 y tiene nombre', () => {
    const w = charterWindow('tarifa', '2026-08-10')!
    expect(w.moonIllumination).toBeGreaterThanOrEqual(0)
    expect(w.moonIllumination).toBeLessThanOrEqual(1)
    expect(w.moonPhaseName.length).toBeGreaterThan(3)
  })
})

describe('mejor zona del día', () => {
  it('todas las zonas de la lista corta existen en el catálogo', () => {
    // Un slug mal escrito no rompe nada: simplemente esa zona nunca se elegiría,
    // y el fallo pasaría desapercibido para siempre.
    expect(ZONAS_CHARTER.filter((s) => !getSpot(s))).toEqual([])
  })

  it('elige una zona y devuelve su ventana', () => {
    const mejor = bestSpotToday('2026-08-05')!
    expect(mejor).not.toBeNull()
    expect(getSpot(mejor.slug)).toBeTruthy()
    expect(mejor.window.rating).toBeGreaterThanOrEqual(1)
  })

  it('es la de mayor valoración de la lista', () => {
    const fecha = '2026-08-05'
    const mejor = bestSpotToday(fecha)!
    for (const slug of ZONAS_CHARTER) {
      const w = charterWindow(slug, fecha)
      if (w) expect(w.rating).toBeLessThanOrEqual(mejor.window.rating)
    }
  })
})
