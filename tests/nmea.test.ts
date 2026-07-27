import { describe, it, expect } from 'vitest'
import { parseSentence, checksumOk, createNmeaReader, usableDepth } from '@/lib/nmea'

/**
 * Las frases son NMEA 0183 real, con sus sumas de comprobación correctas. Si
 * alguna se toca, hay que recalcular el checksum o la prueba deja de valer.
 */
describe('suma de comprobación', () => {
  it('acepta la correcta y rechaza la corrompida', () => {
    expect(checksumOk('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47')).toBe(true)
    // Un solo bit cambiado: es lo que pasa en un cable con salitre.
    expect(checksumOk('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.5,M,46.9,M,,*47')).toBe(false)
  })

  it('las frases sin checksum se aceptan: hay aparatos que no lo mandan', () => {
    expect(checksumOk('$SDDBT,036.1,f,011.0,M,006.0,F')).toBe(true)
  })

  it('un checksum ilegible no cuela', () => {
    expect(checksumOk('$SDDBT,036.1,f,011.0,M,006.0,F*ZZ')).toBe(false)
  })

  /** Aceptar una frase corrompida puede convertir 12 m en 120 m. */
  it('una frase que no cuadra no se interpreta', () => {
    expect(parseSentence('$SDDPT,11.0,0.5*00')).toBeNull()
  })
})

describe('profundidad', () => {
  it('DBT en metros', () => {
    const p = parseSentence('$SDDBT,036.1,f,011.0,M,006.0,F*04')!
    expect(p.type).toBe('DBT')
    expect(p.fix.depthBelowTransducerM).toBeCloseTo(11.0, 2)
  })

  it('DBT solo en pies se convierte', () => {
    const p = parseSentence('$SDDBT,036.1,f,,M,,F*02')!
    expect(p.fix.depthBelowTransducerM).toBeCloseTo(36.1 * 0.3048, 3)
  })

  /**
   * DPT trae el calado del transductor. Un offset positivo va de la superficie
   * al transductor y hay que sumarlo; uno negativo es la holgura bajo la quilla
   * y sumarlo daría MENOS fondo del que hay.
   */
  it('DPT con offset positivo da la profundidad real', () => {
    const p = parseSentence('$SDDPT,11.0,0.5*62')!
    expect(p.fix.depthBelowTransducerM).toBe(11.0)
    expect(p.fix.transducerOffsetM).toBe(0.5)
    expect(p.fix.depthM).toBeCloseTo(11.5, 3)
  })

  it('DPT con offset negativo no inventa profundidad', () => {
    const p = parseSentence('$SDDPT,11.0,-0.7*4D')!
    expect(p.fix.depthM).toBeUndefined()
  })

  it('sin saber el calado del transductor no se da una profundidad', () => {
    // Suponer un calado metería un error sistemático distinto por cada barco, y
    // al juntar datos de varios eso no se promedia: se acumula.
    expect(usableDepth({ depthBelowTransducerM: 11 })).toBeNull()
    expect(usableDepth({ depthBelowTransducerM: 11 }, 0.6)).toBeCloseTo(11.6, 2)
    expect(usableDepth({ depthM: 12.3 })).toBe(12.3)
  })
})

describe('posición', () => {
  it('GGA con grados de dos y tres dígitos', () => {
    const p = parseSentence('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47')!
    expect(p.fix.lat).toBeCloseTo(48.1173, 4)
    // 01131.000 son 11° 31,000', no 113° 1,000': es el error clásico.
    expect(p.fix.lon).toBeCloseTo(11.5167, 4)
  })

  it('los hemisferios sur y oeste salen negativos', () => {
    const p = parseSentence('$GPGGA,123519,3600.768,S,00536.336,W,1,08,0.9,0,M,0,M,,*7B')!
    expect(p.fix.lat).toBeCloseTo(-36.0128, 4)
    expect(p.fix.lon).toBeCloseTo(-5.6056, 4)
  })

  /** Calidad 0 significa "no tengo posición". Usarla la pondría en el ecuador. */
  it('GGA sin arreglo válido se descarta', () => {
    expect(parseSentence('$GPGGA,123519,4807.038,N,01131.000,E,0,00,,,M,,M,,*52')).toBeNull()
  })

  it('RMC da posición, velocidad y rumbo', () => {
    const p = parseSentence('$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A')!
    expect(p.fix.lat).toBeCloseTo(48.1173, 4)
    expect(p.fix.knots).toBeCloseTo(22.4, 2)
    expect(p.fix.courseDeg).toBeCloseTo(84.4, 2)
    expect(new Date(p.fix.timeMs!).toISOString()).toBe('1994-03-23T12:35:19.000Z')
  })

  it('RMC marcada como no válida se descarta', () => {
    // La 'V' es el propio aparato diciendo que no te fíes.
    expect(parseSentence('$GPRMC,123519,V,4807.038,N,01131.000,E,,,230394,,*0A')).toBeNull()
  })
})

describe('temperatura del agua', () => {
  it('en grados Celsius', () => {
    expect(parseSentence('$SDMTW,17.9,C*0B')!.fix.waterTempC).toBe(17.9)
  })

  it('en Fahrenheit se convierte', () => {
    const p = parseSentence('$SDMTW,64.2,F*01')!
    expect(p.fix.waterTempC).toBeCloseTo(17.9, 1)
  })
})

/**
 * Un flujo real llega a trozos que no respetan los saltos de línea, mezcla
 * frases de varios aparatos y trae basura de vez en cuando.
 */
describe('flujo continuo desde el aparato', () => {
  it('junta la profundidad de una frase con la posición de otra', () => {
    const r = createNmeaReader()
    r.push('$SDDPT,11.0,0.5*62\r\n')
    const s = r.push('$GPGGA,123519,3600.768,N,00536.336,W,1,08,0.9,0,M,0,M,,*66\r\n')
    expect(s.depthM).toBeCloseTo(11.5, 2)
    expect(s.lat).toBeCloseTo(36.0128, 4)
    expect(s.lon).toBeCloseTo(-5.6056, 4)
  })

  it('aguanta que una frase llegue partida en dos trozos', () => {
    const r = createNmeaReader()
    r.push('$SDDPT,11.0,')
    const s = r.push('0.5*62\r\n')
    expect(s.depthM).toBeCloseTo(11.5, 2)
    expect(s.discarded).toBe(0)
  })

  it('cuenta lo descartado en vez de tragárselo', () => {
    const r = createNmeaReader()
    const s = r.push('$SDDPT,11.0,0.5*62\r\nbasura del cable\r\n$SDDBT,1,f,2,M,3,F*00\r\n')
    expect(s.read).toBe(3)
    expect(s.discarded).toBe(2)   // la basura y la del checksum malo
    expect(s.depthM).toBeCloseTo(11.5, 2)
  })

  it('ignora en silencio las sentencias que no aportan al fondo', () => {
    const r = createNmeaReader()
    const s = r.push('$GPGSV,3,1,11,01,05,046,,02,17,301,*7B\r\n$SDDPT,11.0,0.5*62\r\n')
    expect(s.depthM).toBeCloseTo(11.5, 2)
  })
})
