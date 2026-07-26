import { describe, it, expect, beforeEach } from 'vitest'
import {
  createWaypoint, listWaypoints, getWaypoint, updateWaypoint,
  deleteWaypoint, deleteAllWaypoints, validateWaypoint,
} from '@/lib/waypoints-store'
import { toGPX, fromGPX } from '@/lib/gpx'

const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => { g.__pescaplusWaypoints = [] })

const A = 'usuario-a'
const B = 'usuario-b'
const base = { name: 'El bajo de las lubinas', lat: 36.0128, lon: -5.6056, depthM: 22.5, notes: 'Cerca de la punta' }

describe('waypoints — privacidad por defecto', () => {
  it('nace privado aunque no se diga nada', async () => {
    const wp = await createWaypoint(A, base)
    expect(wp.visibility).toBe('private')
  })

  it('cualquier valor raro de visibilidad cae del lado seguro', async () => {
    const wp = await createWaypoint(A, { ...base, visibility: 'todo-el-mundo' })
    expect(wp.visibility).toBe('private')
  })

  it('publicar exige pedirlo explícitamente', async () => {
    const wp = await createWaypoint(A, { ...base, visibility: 'public' })
    expect(wp.visibility).toBe('public')
  })
})

/**
 * El plan original delega esto en RLS de Postgres. Aquí la garantía vive en el
 * store, así que hay que demostrarla por todas las vías: leer, listar, editar
 * y borrar una marca ajena tiene que fallar en todas.
 */
describe('waypoints — aislamiento entre usuarios', () => {
  it('B no puede leer, listar, editar ni borrar una marca de A', async () => {
    const wp = await createWaypoint(A, base)

    expect(await getWaypoint(wp.id, B)).toBeNull()
    expect(await listWaypoints(B)).toHaveLength(0)
    expect(await updateWaypoint(wp.id, B, { name: 'secuestrada' })).toBeNull()
    expect(await deleteWaypoint(wp.id, B)).toBe(false)

    // Y sigue intacta para su dueño.
    const still = await getWaypoint(wp.id, A)
    expect(still).not.toBeNull()
    expect(still!.name).toBe(base.name)
  })

  it('B tampoco alcanza una marca PÚBLICA de A por estas vías', async () => {
    // Pública significa "visible en su sitio", no "editable por cualquiera".
    const wp = await createWaypoint(A, { ...base, visibility: 'public' })
    expect(await updateWaypoint(wp.id, B, { name: 'mía ahora' })).toBeNull()
    expect(await deleteWaypoint(wp.id, B)).toBe(false)
    expect(await getWaypoint(wp.id, B)).toBeNull()
  })

  it('sin usuario no se puede hacer nada', async () => {
    const wp = await createWaypoint(A, base)
    await expect(createWaypoint('', base)).rejects.toThrow()
    expect(await getWaypoint(wp.id, '')).toBeNull()
    expect(await listWaypoints('')).toHaveLength(0)
    expect(await deleteWaypoint(wp.id, '')).toBe(false)
  })

  it('borrar toda la cuenta no toca las marcas de otro', async () => {
    await createWaypoint(A, base)
    await createWaypoint(A, { ...base, name: 'Otra' })
    await createWaypoint(B, { ...base, name: 'De B' })

    expect(await deleteAllWaypoints(A)).toBe(2)
    expect(await listWaypoints(A)).toHaveLength(0)
    expect(await listWaypoints(B)).toHaveLength(1)
  })
})

describe('waypoints — validación', () => {
  it('rechaza coordenadas imposibles y sondas absurdas', () => {
    expect(validateWaypoint({ ...base, lat: 95 })).toMatch(/latitud/i)
    expect(validateWaypoint({ ...base, lon: 200 })).toMatch(/longitud/i)
    expect(validateWaypoint({ ...base, depthM: -5 })).toMatch(/sonda/i)
    expect(validateWaypoint({ ...base, name: '   ' })).toMatch(/nombre/i)
    expect(validateWaypoint(base)).toBeNull()
  })

  it('un tipo desconocido no rompe: cae en "otro"', async () => {
    const wp = await createWaypoint(A, { ...base, type: 'agujero-negro' })
    expect(wp.type).toBe('caladero') // al crear, el tipo por defecto
    const edited = await updateWaypoint(wp.id, A, { type: 'naufragio' })
    expect(edited!.type).toBe('naufragio')
  })
})

describe('GPX', () => {
  it('exporta y vuelve a leer sin perder lo importante', async () => {
    await createWaypoint(A, base)
    await createWaypoint(A, { ...base, name: 'Naufragio del norte', type: 'naufragio', depthM: 40, notes: '' })

    const xml = toGPX(await listWaypoints(A))
    expect(xml).toContain('<gpx')
    expect(xml).toContain('El bajo de las lubinas')
    // La sonda viaja como elevación negativa, que es la convención marina.
    expect(xml).toContain('<ele>-22.5</ele>')

    const back = fromGPX(xml)
    expect(back).toHaveLength(2)
    const bajo = back.find((w) => w.name === 'El bajo de las lubinas')!
    expect(bajo.lat).toBeCloseTo(base.lat, 5)
    expect(bajo.depthM).toBe(22.5)
    expect(bajo.notes).toBe('Cerca de la punta')
  })

  it('lee GPX de otros aparatos, con prefijo de espacio de nombres y CDATA', () => {
    const xml = `<?xml version="1.0"?>
      <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
        <gpx:wpt lat="43.3" lon="-8.4">
          <gpx:name><![CDATA[Caladero & compañía]]></gpx:name>
          <gpx:desc>Fondo de 30</gpx:desc>
        </gpx:wpt>
      </gpx>`
    const out = fromGPX(xml)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Caladero & compañía')
    expect(out[0].lat).toBe(43.3)
  })

  it('lo importado entra SIEMPRE como privado', () => {
    const out = fromGPX('<gpx><wpt lat="40" lon="-3"><name>X</name></wpt></gpx>')
    expect(out[0].visibility).toBe('private')
  })

  it('descarta puntos sin coordenadas válidas en vez de romper el archivo', () => {
    const xml = `<gpx>
      <wpt lat="99" lon="-3"><name>Imposible</name></wpt>
      <wpt lon="-3"><name>Sin lat</name></wpt>
      <wpt lat="40" lon="-3"><name>Buena</name></wpt>
    </gpx>`
    const out = fromGPX(xml)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Buena')
  })

  it('escapa caracteres que romperían el XML', async () => {
    await createWaypoint(A, { ...base, name: 'Roca <peligro> & "la mala"' })
    const xml = toGPX(await listWaypoints(A))
    expect(xml).toContain('&lt;peligro&gt;')
    expect(xml).toContain('&amp;')
    expect(fromGPX(xml)[0].name).toBe('Roca <peligro> & "la mala"')
  })
})
