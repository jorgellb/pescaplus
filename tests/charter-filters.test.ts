import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseCharterFilter, isFiltered, filterToQuery, matches, describeFilter, fold,
  EMPTY_FILTER, type FilterableCharter,
} from '@/lib/charter-filters'
import { registerOperator, setOperatorVerified } from '@/lib/operators-store'
import { createCharter, listPublicCharters } from '@/lib/charters-store'

const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => {
  for (const k of ['__pescaplusOperators', '__pescaplusCharters', '__pescaplusBookings']) g[k] = []
})

const base: FilterableCharter = {
  spotSlug: 'tarifa', dateISO: '2030-08-15', pricePerPerson: 120, tripType: 'privada',
  techniques: ['spinning', 'jigging'], species: ['atun-rojo'], areas: ['altamar'],
  highlights: 'Pesca del atún al amanecer',
  operator: { name: 'Paco', businessName: 'Charter Tarifa', boatName: 'Indira I' },
}

describe('filtros de chárter — lectura de la URL', () => {
  it('valida contra el catálogo y descarta lo inventado', () => {
    const f = parseCharterFilter({
      zona: 'tarifa', tecnica: 'spinning,inventada', especie: 'atun-rojo,dragon',
      tipo: 'privada', precio: '200', desde: '2030-08-01', hasta: '2030-08-31', q: '  atún  ',
    })
    expect(f.spotSlug).toBe('tarifa')
    expect(f.techniques).toEqual(['spinning'])
    expect(f.species).toEqual(['atun-rojo'])
    expect(f.tripType).toBe('privada')
    expect(f.maxPrice).toBe(200)
    expect(f.q).toBe('atún')
  })

  it('ignora valores imposibles en vez de romper', () => {
    const f = parseCharterFilter({ zona: 'no-existe', tipo: 'raro', precio: '-5', desde: 'ayer' })
    expect(f.spotSlug).toBe('')
    expect(f.tripType).toBe('')
    expect(f.maxPrice).toBeNull()
    expect(f.fromISO).toBe('')
    expect(isFiltered(f)).toBe(false)
  })

  it('reconstruye la query sin parámetros vacíos', () => {
    expect(filterToQuery(EMPTY_FILTER)).toBe('')
    const q = filterToQuery({ ...EMPTY_FILTER, spotSlug: 'tarifa', techniques: ['spinning', 'jigging'] })
    expect(q).toContain('zona=tarifa')
    expect(q).toContain('tecnica=spinning%2Cjigging')
    expect(q).not.toContain('precio')
  })
})

describe('filtros de chárter — el predicado', () => {
  const f = (over: Partial<typeof EMPTY_FILTER>) => ({ ...EMPTY_FILTER, ...over })

  it('sin filtros, todo pasa', () => {
    expect(matches(base, EMPTY_FILTER)).toBe(true)
  })

  it('zona, tipo y precio máximo', () => {
    expect(matches(base, f({ spotSlug: 'tarifa' }))).toBe(true)
    expect(matches(base, f({ spotSlug: 'viveiro' }))).toBe(false)
    expect(matches(base, f({ tripType: 'compartida' }))).toBe(false)
    expect(matches(base, f({ maxPrice: 120 }))).toBe(true) // el límite entra
    expect(matches(base, f({ maxPrice: 119 }))).toBe(false)
  })

  it('rango de fechas, ambos extremos incluidos', () => {
    expect(matches(base, f({ fromISO: '2030-08-15', untilISO: '2030-08-15' }))).toBe(true)
    expect(matches(base, f({ fromISO: '2030-08-16' }))).toBe(false)
    expect(matches(base, f({ untilISO: '2030-08-14' }))).toBe(false)
  })

  it('las listas son "alguna de", no "todas"', () => {
    expect(matches(base, f({ techniques: ['spinning'] }))).toBe(true)
    expect(matches(base, f({ techniques: ['popping', 'jigging'] }))).toBe(true)
    expect(matches(base, f({ techniques: ['popping'] }))).toBe(false)
    expect(matches(base, f({ species: ['atun-rojo', 'lubina'] }))).toBe(true)
  })

  it('el texto libre ignora acentos y mira varios campos', () => {
    expect(fold('atún')).toBe('atun')
    expect(matches(base, f({ q: 'atun' }))).toBe(true) // sin tilde encuentra "atún"
    expect(matches(base, f({ q: 'ATÚN' }))).toBe(true)
    expect(matches(base, f({ q: 'indira' }))).toBe(true) // nombre del barco
    expect(matches(base, f({ q: 'charter tarifa' }))).toBe(true) // nombre comercial
    expect(matches(base, f({ q: 'merluza' }))).toBe(false)
  })

  it('describe los filtros activos en lenguaje natural', () => {
    const d = describeFilter(f({ spotSlug: 'tarifa', tripType: 'privada', maxPrice: 200 }))
    expect(d).toMatch(/privadas/)
    expect(d).toMatch(/hasta 200 €/)
  })
})

describe('filtros aplicados al listado público (memoria)', () => {
  it('devuelve solo lo que coincide, y nunca salidas pasadas', async () => {
    const op = await registerOperator({ name: 'P', email: 'p@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' })
    await setOperatorVerified(op.id, true)
    const mk = (over: Record<string, unknown>) => createCharter(op.id, op.manageToken, {
      spotSlug: 'tarifa', dateISO: '2030-08-15', timeStart: '08:00', modality: 'barco',
      pricePerPerson: 120, maxPlaces: 4, minToConfirm: 1, ...over,
    } as never)

    await mk({ techniques: ['spinning'], species: ['atun-rojo'], highlights: 'Atún a spinning' })
    await mk({ techniques: ['fondo'], pricePerPerson: 60, highlights: 'Fondo tranquilo' })
    await mk({ dateISO: '2020-01-01', highlights: 'Salida antigua' }) // pasada

    const today = '2026-07-26'
    expect(await listPublicCharters(today)).toHaveLength(2) // la pasada nunca sale

    const spinning = await listPublicCharters(today, { ...EMPTY_FILTER, techniques: ['spinning'] })
    expect(spinning).toHaveLength(1)
    expect(spinning[0].highlights).toBe('Atún a spinning')

    const barato = await listPublicCharters(today, { ...EMPTY_FILTER, maxPrice: 80 })
    expect(barato).toHaveLength(1)
    expect(barato[0].highlights).toBe('Fondo tranquilo')

    // Un "desde" anterior a hoy no resucita las salidas pasadas.
    const conDesdeViejo = await listPublicCharters(today, { ...EMPTY_FILTER, fromISO: '2019-01-01' })
    expect(conDesdeViejo).toHaveLength(2)
  })
})
