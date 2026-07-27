import { describe, it, expect } from 'vitest'
import { fieldsToDecimal, spreadPasted, type CoordFields } from '@/components/carta/CoordinateEntry'
import { formatNautical } from '@/lib/marks-io'

const campos = (p: Partial<CoordFields>): CoordFields => ({
  latG: '', latM: '', latH: 'N', lonG: '', lonM: '', lonH: 'O', ...p,
})

describe('coordenadas escritas a mano', () => {
  it('grados y minutos a decimal', () => {
    const { lat, lon } = fieldsToDecimal(campos({ latG: '36', latM: '00,768', lonG: '005', lonM: '36,336' }))
    expect(lat).toBeCloseTo(36.0128, 5)
    expect(lon).toBeCloseTo(-5.6056, 5)
  })

  it('los hemisferios mandan sobre el signo', () => {
    expect(fieldsToDecimal(campos({ latG: '33', latM: '30', latH: 'S' })).lat).toBeCloseTo(-33.5, 5)
    expect(fieldsToDecimal(campos({ lonG: '151', lonM: '15', lonH: 'E' })).lon).toBeCloseTo(151.25, 5)
  })

  it('acepta la coma decimal, que es como se escribe aquí', () => {
    expect(fieldsToDecimal(campos({ latG: '36', latM: '30,5' })).lat)
      .toBeCloseTo(fieldsToDecimal(campos({ latG: '36', latM: '30.5' })).lat, 9)
  })

  it('sin minutos vale: son opcionales', () => {
    expect(fieldsToDecimal(campos({ latG: '36' })).lat).toBe(36)
  })

  /**
   * Escribir 75 en los minutos es el error típico de quien copia mal del papel.
   * Aceptarlo daría un punto a 15 millas del que buscaba, sin avisar.
   */
  it('rechaza minutos de 60 o más', () => {
    expect(fieldsToDecimal(campos({ latG: '36', latM: '60' })).lat).toBeNaN()
    expect(fieldsToDecimal(campos({ latG: '36', latM: '75,5' })).lat).toBeNaN()
  })

  it('rechaza lo que se sale del mundo', () => {
    expect(fieldsToDecimal(campos({ latG: '91' })).lat).toBeNaN()
    expect(fieldsToDecimal(campos({ latG: '90', latM: '0,1' })).lat).toBeNaN()
    expect(fieldsToDecimal(campos({ lonG: '181' })).lon).toBeNaN()
    expect(fieldsToDecimal(campos({ latG: '-5' })).lat).toBeNaN()
  })

  it('sin grados no hay coordenada', () => {
    expect(fieldsToDecimal(campos({ latM: '30' })).lat).toBeNaN()
    expect(fieldsToDecimal(campos({ latG: 'hola' })).lat).toBeNaN()
  })
})

/**
 * Media flota se pasa los caladeros por WhatsApp, cada uno en el formato que le
 * sale. Si se pega algo reconocible, se reparte solo entre los campos.
 */
describe('pegar coordenadas de cualquier manera', () => {
  it('notación náutica con símbolos', () => {
    const f = spreadPasted("36°00.768'N 5°36.336'W")!
    expect(f.latG).toBe('36')
    expect(f.latH).toBe('N')
    expect(f.lonH).toBe('O')
    const { lat, lon } = fieldsToDecimal(f)
    expect(lat).toBeCloseTo(36.0128, 4)
    expect(lon).toBeCloseTo(-5.6056, 4)
  })

  it('grados decimales separados por coma, como los da Google Maps', () => {
    const f = spreadPasted('36.0128, -5.6056')!
    const { lat, lon } = fieldsToDecimal(f)
    expect(lat).toBeCloseTo(36.0128, 4)
    expect(lon).toBeCloseTo(-5.6056, 4)
    expect(f.lonH).toBe('O')
  })

  it('con la O de Oeste en español', () => {
    const f = spreadPasted("43° 18,126' N / 008° 24,270' O")!
    const { lat, lon } = fieldsToDecimal(f)
    expect(lat).toBeCloseTo(43.3021, 3)
    expect(lon).toBeCloseTo(-8.4045, 3)
  })

  it('lo que no se entiende no se reparte a medias', () => {
    // Devolver algo a medio rellenar sería peor que no tocar nada.
    expect(spreadPasted('el bajo de siempre')).toBeNull()
    expect(spreadPasted('99, -5.6')).toBeNull()
    expect(spreadPasted('')).toBeNull()
  })

  it('lo pegado, formateado y vuelto a leer, da lo mismo', () => {
    const f = spreadPasted("36°00.768'N 5°36.336'W")!
    const { lat, lon } = fieldsToDecimal(f)
    const escrito = formatNautical(lat, lon)
    expect(escrito.lat).toBe("36° 00,768' N")
    expect(escrito.lon).toBe("005° 36,336' O")
  })
})
