import { describe, it, expect } from 'vitest'
import {
  parseMarks, parseGPX, parseCSV, parseKML, parseCoord, detectFormat, toCSV, toKML, formatNautical,
} from '@/lib/marks-io'
import { toGPX } from '@/lib/gpx'
import type { Waypoint } from '@/lib/waypoint-types'

/**
 * Los ficheros de abajo imitan lo que exportan los aparatos reales, con sus
 * manías: prefijos de espacio de nombres, etiquetas auto-cerradas, comillas
 * simples, símbolos propios de cada marca, BOM de Excel y coma decimal.
 */
describe('reconocer el formato', () => {
  it('mira el contenido, no la extensión', () => {
    // La gente renombra ficheros y hay aparatos que exportan CSV con .txt.
    expect(detectFormat('<?xml version="1.0"?><gpx><wpt lat="1" lon="2"/></gpx>', 'marcas.txt')).toBe('gpx')
    expect(detectFormat('<kml><Placemark/></kml>', 'x.dat')).toBe('kml')
    expect(detectFormat('nombre;lat;lon\nBajo;36,01;-5,60', 'export.txt')).toBe('csv')
  })

  it('el BOM de Excel no despista', () => {
    expect(detectFormat('﻿Nombre;Latitud;Longitud\nX;36,0;-5,6', 'a.csv')).toBe('csv')
  })

  it('lo que no se entiende se dice, no se adivina', () => {
    const r = parseMarks('\x00\x01binario propietario', 'marcas.usr')
    expect(r.format).toBeNull()
    expect(r.waypoints).toHaveLength(0)
    expect(r.warnings[0]).toMatch(/GPX/i)
  })
})

describe('GPX de los aparatos reales', () => {
  it('lee marcas dentro de una ruta, no solo <wpt>', () => {
    // Bastantes plotters exportan las marcas dentro de <rte>. Un lector que solo
    // mire <wpt> diría "no se han encontrado marcas" ante un fichero lleno.
    const xml = `<?xml version="1.0"?>
      <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
        <rte><name>Ruta al bajo</name>
          <rtept lat="36.0128" lon="-5.6056"><name>Bajo de las lubinas</name></rtept>
          <rtept lat="36.0200" lon="-5.6100"><name>Punta</name></rtept>
        </rte>
      </gpx>`
    const r = parseGPX(xml)
    expect(r.waypoints).toHaveLength(2)
    expect(r.waypoints[0].name).toBe('Bajo de las lubinas')
  })

  it('acepta etiquetas auto-cerradas y comillas simples', () => {
    const xml = `<gpx><wpt lat='43.30' lon='-8.40'/><wpt lat="43.31" lon="-8.41"/></gpx>`
    expect(parseGPX(xml).waypoints).toHaveLength(2)
  })

  it('no duplica un punto que viene como <wpt> y dentro de la ruta', () => {
    const xml = `<gpx>
      <wpt lat="36.0128" lon="-5.6056"><name>El bajo</name></wpt>
      <rte><rtept lat="36.0128" lon="-5.6056"><name>El bajo</name></rtept></rte>
    </gpx>`
    expect(parseGPX(xml).waypoints).toHaveLength(1)
  })

  it('traduce los símbolos de cada marca a nuestros tipos', () => {
    const xml = `<gpx>
      <wpt lat="36.01" lon="-5.60"><name>A</name><sym>Shipwreck</sym></wpt>
      <wpt lat="36.02" lon="-5.61"><name>B</name><sym>Fishing Area</sym></wpt>
      <wpt lat="36.03" lon="-5.62"><name>C</name><sym>wpt_danger</sym></wpt>
      <wpt lat="36.04" lon="-5.63"><name>D</name><sym>Simbolito Raro</sym></wpt>
    </gpx>`
    const t = parseGPX(xml).waypoints.map((w) => w.type)
    expect(t).toEqual(['naufragio', 'caladero', 'peligro', 'otro'])
  })

  it('la sonda viaja como elevación negativa', () => {
    const xml = '<gpx><wpt lat="36.01" lon="-5.60"><name>X</name><ele>-22.5</ele></wpt></gpx>'
    expect(parseGPX(xml).waypoints[0].depthM).toBe(22.5)
  })

  it('usa <cmt> cuando el aparato no escribe <desc>', () => {
    const xml = '<gpx><wpt lat="36.01" lon="-5.60"><name>X</name><cmt>Cerca de la punta</cmt></wpt></gpx>'
    expect(parseGPX(xml).waypoints[0].notes).toBe('Cerca de la punta')
  })

  it('descarta coordenadas imposibles y lo dice', () => {
    const xml = '<gpx><wpt lat="99" lon="-5.6"><name>A</name></wpt><wpt lat="36" lon="-5.6"><name>B</name></wpt></gpx>'
    const r = parseGPX(xml)
    expect(r.waypoints).toHaveLength(1)
    expect(r.warnings[0]).toMatch(/no válidas/i)
  })

  it('todo lo importado entra como privado', () => {
    const xml = '<gpx><wpt lat="36" lon="-5.6"><name>X</name></wpt></gpx>'
    expect(parseGPX(xml).waypoints[0].visibility).toBe('private')
  })
})

describe('coordenadas como las escriben los aparatos', () => {
  it('grados decimales, con punto o con coma', () => {
    expect(parseCoord('36.0128')).toBeCloseTo(36.0128, 6)
    expect(parseCoord('36,0128')).toBeCloseTo(36.0128, 6)
    expect(parseCoord('-5.6056')).toBeCloseTo(-5.6056, 6)
  })

  it('grados y minutos, que es como se leen a bordo', () => {
    expect(parseCoord("36° 00.768' N")).toBeCloseTo(36.0128, 4)
    expect(parseCoord("5° 36.336' W")).toBeCloseTo(-5.6056, 4)
    expect(parseCoord('N36 00.768')).toBeCloseTo(36.0128, 4)
  })

  it('grados, minutos y segundos', () => {
    expect(parseCoord('36 00 46 N')).toBeCloseTo(36.0128, 3)
  })

  it('la O de Oeste es negativa, como la W', () => {
    expect(parseCoord("5° 36.336' O")).toBeCloseTo(-5.6056, 4)
  })

  it('lo ilegible devuelve NaN en vez de un número inventado', () => {
    expect(parseCoord('no es una coordenada')).toBeNaN()
    expect(parseCoord('')).toBeNaN()
  })
})

describe('CSV', () => {
  it('detecta el punto y coma del Excel español y su coma decimal', () => {
    const csv = '﻿Nombre;Latitud;Longitud;Sonda;Notas\nBajo de las lubinas;36,0128;-5,6056;22,5;Cerca de la punta'
    const r = parseCSV(csv)
    expect(r.waypoints).toHaveLength(1)
    expect(r.waypoints[0].lat).toBeCloseTo(36.0128, 6)
    expect(r.waypoints[0].lon).toBeCloseTo(-5.6056, 6)
    expect(r.waypoints[0].depthM).toBe(22.5)
    expect(r.waypoints[0].notes).toBe('Cerca de la punta')
  })

  it('también con comas y cabeceras en inglés', () => {
    const csv = 'name,lat,lon,depth\nWreck,43.30,-8.40,-40'
    const r = parseCSV(csv)
    expect(r.waypoints[0].name).toBe('Wreck')
    // La sonda vale igual venga positiva o negativa: cada aparato usa un convenio.
    expect(r.waypoints[0].depthM).toBe(40)
  })

  it('respeta las comillas y los separadores dentro de un campo', () => {
    const csv = 'nombre;lat;lon\n"Bajo, el de siempre";36,01;-5,60'
    expect(parseCSV(csv).waypoints[0].name).toBe('Bajo, el de siempre')
  })

  it('sin columnas de coordenadas lo dice claro', () => {
    const r = parseCSV('a;b;c\n1;2;3')
    expect(r.waypoints).toHaveLength(0)
    expect(r.warnings[0]).toMatch(/latitud/i)
  })
})

describe('KML', () => {
  it('lee los Placemark con su orden lon,lat', () => {
    const kml = `<kml><Document>
      <Placemark><name>El bajo</name><description>Buen sitio</description>
        <Point><coordinates>-5.6056,36.0128,-22.5</coordinates></Point></Placemark>
    </Document></kml>`
    const r = parseKML(kml)
    expect(r.waypoints[0].lat).toBeCloseTo(36.0128, 6)
    expect(r.waypoints[0].lon).toBeCloseTo(-5.6056, 6)
    expect(r.waypoints[0].depthM).toBe(22.5)
  })
})

/** Exportar y volver a leer: si esto falla, alguien pierde sus marcas. */
describe('ida y vuelta por cada formato', () => {
  const marcas: Waypoint[] = [
    {
      id: '1', userId: 'u', name: 'Bajo de las lubinas', type: 'bajo',
      lat: 36.0128, lon: -5.6056, depthM: 22.5, notes: 'Cerca de la punta',
      visibility: 'private', createdAt: 0, updatedAt: 0,
    },
    {
      id: '2', userId: 'u', name: 'Naufragio & "el grande"', type: 'naufragio',
      lat: 43.3021, lon: -8.4045, depthM: 40, notes: '',
      visibility: 'private', createdAt: 0, updatedAt: 0,
    },
  ]

  it('GPX', () => {
    const r = parseMarks(toGPX(marcas), 'x.gpx')
    expect(r.format).toBe('gpx')
    expect(r.waypoints).toHaveLength(2)
    expect(r.waypoints[0].name).toBe('Bajo de las lubinas')
    expect(r.waypoints[0].depthM).toBe(22.5)
    expect(r.waypoints[1].name).toBe('Naufragio & "el grande"')
  })

  it('CSV', () => {
    const r = parseMarks(toCSV(marcas), 'x.csv')
    expect(r.format).toBe('csv')
    expect(r.waypoints).toHaveLength(2)
    expect(r.waypoints[0].lat).toBeCloseTo(36.0128, 5)
    expect(r.waypoints[0].depthM).toBe(22.5)
    expect(r.waypoints[1].name).toBe('Naufragio & "el grande"')
  })

  it('KML', () => {
    const r = parseMarks(toKML(marcas), 'x.kml')
    expect(r.format).toBe('kml')
    expect(r.waypoints).toHaveLength(2)
    expect(r.waypoints[0].lon).toBeCloseTo(-5.6056, 5)
    expect(r.waypoints[1].name).toBe('Naufragio & "el grande"')
  })

  it('el CSV sale listo para el Excel español', () => {
    const csv = toCSV(marcas)
    expect(csv.startsWith('﻿')).toBe(true)   // sin BOM las tildes salen mal
    expect(csv).toContain('36,012800')            // coma decimal
    expect(csv.split('\n')[0]).toContain(';')     // punto y coma
  })
})

describe('escribir coordenadas como se leen a bordo', () => {
  it('grados y minutos decimales, con la longitud a tres dígitos', () => {
    // Tres dígitos en longitud es convenio marino: evita confundirla con la
    // latitud cuando alguien las dicta por radio.
    const c = formatNautical(36.0128, -5.6056)
    expect(c.lat).toBe("36° 00,768' N")
    expect(c.lon).toBe("005° 36,336' O")
  })

  it('los hemisferios sur y este', () => {
    const c = formatNautical(-33.5, 151.25)
    expect(c.lat).toBe("33° 30,000' S")
    expect(c.lon).toBe("151° 15,000' E")
  })

  it("59,9999' sube el grado en vez de escribir 60'", () => {
    expect(formatNautical(35.99999999, 0).lat).toBe("36° 00,000' N")
  })

  it('lo que se escribe se vuelve a leer igual', () => {
    for (const [lat, lon] of [[36.0128, -5.6056], [43.3021, -8.4045], [-33.5, 151.25]]) {
      const c = formatNautical(lat, lon)
      expect(parseCoord(c.lat)).toBeCloseTo(lat, 4)
      expect(parseCoord(c.lon)).toBeCloseTo(lon, 4)
    }
  })
})
