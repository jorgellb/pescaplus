import { describe, it, expect, beforeEach } from 'vitest'
import { shareCatch, getSpotActivity, getSpeciesActivity, validateCatch, MIN_REPORTS } from '@/lib/catch-reports'
import { todayMadridISO, addDaysISO } from '@/lib/solunar-format'

const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => { g.__pescaplusCatches = [] })

const hoy = todayMadridISO()
const share = (speciesId: string, dias = 0, qty = 1, spotSlug = 'tarifa') =>
  shareCatch({ spotSlug, speciesId, dateISO: addDaysISO(hoy, -dias), qty })

describe('capturas compartidas — validación', () => {
  it('rechaza zonas y especies que no existen', () => {
    expect(validateCatch({ spotSlug: 'atlantida', speciesId: 'lubina', dateISO: hoy })).toMatch(/zona/i)
    expect(validateCatch({ spotSlug: 'tarifa', speciesId: 'dragon', dateISO: hoy })).toMatch(/especie/i)
  })

  it('rechaza fechas futuras y demasiado viejas', () => {
    expect(validateCatch({ spotSlug: 'tarifa', speciesId: 'lubina', dateISO: addDaysISO(hoy, 1) })).toMatch(/aún no/i)
    expect(validateCatch({ spotSlug: 'tarifa', speciesId: 'lubina', dateISO: addDaysISO(hoy, -400) })).toMatch(/último año/i)
    expect(validateCatch({ spotSlug: 'tarifa', speciesId: 'lubina', dateISO: hoy })).toBeNull()
  })
})

describe('umbral de privacidad', () => {
  it('no muestra nada por debajo del mínimo de capturas', async () => {
    await share('lubina'); await share('lubina')
    const a = await getSpotActivity('tarifa')
    expect(a.reports).toBe(2)
    expect(a.enough).toBe(false)
    expect(a.species).toEqual([]) // ni siquiera qué especie: 2 capturas no son tendencia
  })

  it('al alcanzar el mínimo ya se agrega', async () => {
    for (let i = 0; i < MIN_REPORTS; i++) await share('lubina')
    const a = await getSpotActivity('tarifa')
    expect(a.enough).toBe(true)
    expect(a.species[0].speciesId).toBe('lubina')
  })
})

describe('agregación por zona', () => {
  it('ordena por número de capturas y calcula el reparto', async () => {
    await share('lubina'); await share('lubina'); await share('lubina')
    await share('dorada'); await share('dorada')
    const a = await getSpotActivity('tarifa')
    expect(a.species.map((s) => s.speciesId)).toEqual(['lubina', 'dorada'])
    expect(a.species[0].share).toBe(60) // 3 de 5
    expect(a.species[1].share).toBe(40)
  })

  it('suma ejemplares aparte de capturas', async () => {
    await share('lubina', 0, 4); await share('lubina', 1, 2); await share('lubina', 2, 1)
    const a = await getSpotActivity('tarifa')
    expect(a.species[0].reports).toBe(3)
    expect(a.species[0].fish).toBe(7)
  })

  it('ignora lo que cae fuera de la ventana reciente', async () => {
    for (let i = 0; i < MIN_REPORTS; i++) await share('lubina', 60) // hace dos meses
    expect((await getSpotActivity('tarifa')).enough).toBe(false)
  })

  it('cada zona lleva su propio recuento', async () => {
    for (let i = 0; i < MIN_REPORTS; i++) await share('lubina', 0, 1, 'tarifa')
    expect((await getSpotActivity('tarifa')).enough).toBe(true)
    expect((await getSpotActivity('santa-pola')).enough).toBe(false)
  })

  it('la vista por especie hereda el umbral de la zona', async () => {
    await share('lubina'); await share('dorada')
    expect((await getSpeciesActivity('tarifa', 'lubina')).enough).toBe(false)
    await share('dorada') // ya son 3 en la zona
    const sp = await getSpeciesActivity('tarifa', 'dorada')
    expect(sp.enough).toBe(true)
    expect(sp.reports).toBe(2)
  })
})
