import { describe, it, expect } from 'vitest'
import { patronDe, patrones, cuantasFaltan, MIN_MUESTRAS, type CatchWithContext } from '@/lib/catch-patterns'

const T = (h: number) => Date.UTC(2026, 6, 20, h, 0, 0)

function captura(over: {
  especie?: string; hora?: number; coef?: number; sonda?: number | null
  agua?: number | null; viento?: number | null; sustrato?: string | null
  exacto?: boolean; sinHora?: boolean; qty?: number
} = {}): CatchWithContext {
  const faltan: string[] = []
  if (over.sinHora) faltan.push('hora de la captura')
  return {
    speciesId: over.especie ?? 'lubina',
    dateISO: '2026-07-20',
    qty: over.qty ?? 1,
    context: {
      t: T(over.hora ?? 7),
      luna: { fase: 'Llena', coeficiente: over.coef ?? 90, coeficienteTexto: 'Marea viva' },
      marea: { subiendo: null, disponible: false },
      fondo: {
        sondaM: over.sonda === null ? null : over.sonda ?? 12,
        relieve: null,
        sustrato: over.sustrato === null ? null : over.sustrato ?? 'Roca o fondo duro',
      },
      mar: {
        disponible: true,
        vientoKmh: over.viento === null ? null : over.viento ?? 10,
        vientoDir: 'N', olaM: 0.5,
        aguaC: over.agua === null ? null : over.agua ?? 19,
        actividad: 60,
      },
      faltan,
      puntoExacto: over.exacto ?? true,
    },
  }
}

/**
 * La regla que sostiene todo: nadie planifica un madrugón con un patrón sacado
 * de tres capturas. Por debajo del mínimo no se afirma nada.
 */
describe('no se inventan patrones', () => {
  it('por debajo del mínimo no hay patrón', () => {
    const pocas = Array.from({ length: MIN_MUESTRAS - 1 }, () => captura())
    expect(patronDe('lubina', pocas)).toBeNull()
    expect(patrones(pocas)).toEqual([])
  })

  it('justo en el mínimo ya sale', () => {
    const justas = Array.from({ length: MIN_MUESTRAS }, () => captura())
    expect(patronDe('lubina', justas)).not.toBeNull()
  })

  it('dice cuántas faltan, para que no parezca roto', () => {
    expect(cuantasFaltan([captura(), captura()], 'lubina')).toBe(MIN_MUESTRAS - 2)
    expect(cuantasFaltan([], 'dorada')).toBe(MIN_MUESTRAS)
    expect(cuantasFaltan(Array.from({ length: 9 }, () => captura()), 'lubina')).toBe(0)
  })

  it('cada especie cuenta por separado', () => {
    const mezcla = [
      ...Array.from({ length: MIN_MUESTRAS }, () => captura({ especie: 'lubina' })),
      ...Array.from({ length: 2 }, () => captura({ especie: 'dorada' })),
    ]
    const p = patrones(mezcla)
    expect(p).toHaveLength(1)
    expect(p[0].speciesId).toBe('lubina')
  })
})

describe('lo que dicen tus capturas', () => {
  const seis = [
    captura({ sonda: 8, coef: 95, agua: 18, viento: 6, hora: 7 }),
    captura({ sonda: 11, coef: 88, agua: 19, viento: 9, hora: 8 }),
    captura({ sonda: 14, coef: 102, agua: 19.5, viento: 12, hora: 7 }),
    captura({ sonda: 9, coef: 76, agua: 20, viento: 8, hora: 6 }),
    captura({ sonda: 16, coef: 91, agua: 18.5, viento: 15, hora: 9 }),
    captura({ sonda: 12, coef: 84, agua: 19, viento: 11, hora: 8 }),
  ]

  it('da el rango y la mediana de la sonda', () => {
    const p = patronDe('lubina', seis)!
    expect(p.sondaM).toEqual({ min: 8, max: 16, mediana: 11.5, n: 6 })
  })

  /** La mediana aguanta mejor una captura rara que la media. */
  it('una captura suelta muy distinta no desplaza la mediana', () => {
    const conRara = [...seis, captura({ sonda: 400 })]
    const p = patronDe('lubina', conRara)!
    expect(p.sondaM!.max).toBe(400)          // se ve que existe
    expect(p.sondaM!.mediana).toBeLessThan(15) // pero no manda
  })

  it('la franja del día más repetida, con su cuenta', () => {
    const p = patronDe('lubina', seis)!
    expect(p.franja).toEqual({ tipo: 'al amanecer', n: 6 })
  })

  it('el fondo más repetido', () => {
    const mezcla = [
      ...Array.from({ length: 4 }, () => captura({ sustrato: 'Roca o fondo duro' })),
      ...Array.from({ length: 2 }, () => captura({ sustrato: 'Arena' })),
    ]
    const p = patronDe('lubina', mezcla)!
    expect(p.fondo).toEqual({ tipo: 'Roca o fondo duro', n: 4 })
  })

  it('cuenta capturas y piezas por separado', () => {
    const p = patronDe('lubina', [...seis, captura({ qty: 3 })])!
    expect(p.capturas).toBe(7)
    expect(p.piezas).toBe(9)
  })
})

describe('lo que no se sabe se avisa', () => {
  it('avisa de las capturas sin punto exacto', () => {
    const mezcla = [
      ...Array.from({ length: 4 }, () => captura({ exacto: true })),
      ...Array.from({ length: 2 }, () => captura({ exacto: false })),
    ]
    const p = patronDe('lubina', mezcla)!
    expect(p.avisos.some((a) => /punto exacto/i.test(a))).toBe(true)
    expect(p.avisos[0]).toContain('2 de 6')
  })

  it('las capturas sin hora no cuentan para la franja, y se dice', () => {
    const mezcla = [
      ...Array.from({ length: 5 }, () => captura({ hora: 7 })),
      ...Array.from({ length: 2 }, () => captura({ sinHora: true })),
    ]
    const p = patronDe('lubina', mezcla)!
    expect(p.franja!.n).toBe(5)
    expect(p.avisos.some((a) => /sin hora/i.test(a))).toBe(true)
  })

  /**
   * Un dato que falta en muchas capturas no puede dar un rango: con dos
   * temperaturas de agua no se describe nada.
   */
  it('sin bastantes valores de un dato, ese dato no da rango', () => {
    const mezcla = [
      ...Array.from({ length: 6 }, () => captura({ agua: null })),
    ]
    const p = patronDe('lubina', mezcla)!
    expect(p.aguaC).toBeNull()
    expect(p.sondaM).not.toBeNull()
  })
})
