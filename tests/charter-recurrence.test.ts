import { describe, it, expect } from 'vitest'
import { expandSeriesDates, describeSeries, MAX_SERIES_DATES, WEEKDAYS } from '@/lib/charter-recurrence'

describe('fechas recurrentes de chárter', () => {
  it('sin repetición devuelve solo el día elegido', () => {
    expect(expandSeriesDates('2030-08-15', null).dates).toEqual(['2030-08-15'])
    expect(expandSeriesDates('2030-08-15', { weekdays: [], untilISO: '2030-09-15' }).dates).toEqual(['2030-08-15'])
  })

  it('genera todos los sábados del rango, ambos extremos incluidos', () => {
    // 2030-08-03 es sábado.
    const { dates, truncated } = expandSeriesDates('2030-08-03', { weekdays: [6], untilISO: '2030-08-31' })
    expect(dates).toEqual(['2030-08-03', '2030-08-10', '2030-08-17', '2030-08-24', '2030-08-31'])
    expect(truncated).toBe(false)
    for (const d of dates) expect(new Date(`${d}T00:00:00Z`).getUTCDay()).toBe(6)
  })

  it('admite varios días de la semana', () => {
    const { dates } = expandSeriesDates('2030-08-03', { weekdays: [6, 0], untilISO: '2030-08-12' })
    expect(dates).toEqual(['2030-08-03', '2030-08-04', '2030-08-10', '2030-08-11'])
  })

  it('el día de inicio solo entra si cae en un día elegido', () => {
    // 2030-08-05 es lunes; pedimos sábados.
    const { dates } = expandSeriesDates('2030-08-05', { weekdays: [6], untilISO: '2030-08-20' })
    expect(dates[0]).toBe('2030-08-10')
  })

  it('corta en el máximo y lo señala', () => {
    const { dates, truncated } = expandSeriesDates('2030-01-01', { weekdays: [0, 1, 2, 3, 4, 5, 6], untilISO: '2031-01-01' })
    expect(dates).toHaveLength(MAX_SERIES_DATES)
    expect(truncated).toBe(true)
  })

  it('rechaza rangos y fechas imposibles', () => {
    expect(expandSeriesDates('2030-08-15', { weekdays: [6], untilISO: '2030-08-01' }).error).toMatch(/anterior/i)
    expect(expandSeriesDates('no-es-fecha', { weekdays: [6], untilISO: '2030-08-01' }).error).toBeTruthy()
    expect(expandSeriesDates('2030-08-15', { weekdays: [6], untilISO: 'xx' }).error).toBeTruthy()
    // Un rango donde el día elegido no aparece.
    expect(expandSeriesDates('2030-08-05', { weekdays: [6], untilISO: '2030-08-08' }).error).toMatch(/ningún día/i)
  })

  it('ignora números de día inválidos', () => {
    const { dates } = expandSeriesDates('2030-08-03', { weekdays: [6, 99, -1], untilISO: '2030-08-10' })
    expect(dates).toEqual(['2030-08-03', '2030-08-10'])
  })

  it('describe la serie en lenguaje natural', () => {
    expect(describeSeries({ weekdays: [6], untilISO: 'x' }, 5)).toBe('Todos los sábados · 5 salidas')
    expect(describeSeries({ weekdays: [6, 0], untilISO: 'x' }, 8)).toMatch(/sábado y domingo · 8 salidas/)
    expect(describeSeries(null, 1)).toBe('Una sola salida')
  })

  it('el selector cubre la semana entera empezando en lunes', () => {
    expect(WEEKDAYS.map((w) => w.id)).toEqual([1, 2, 3, 4, 5, 6, 0])
  })
})

// --- Integración con el store (backend de memoria) -------------------------
import { beforeEach } from 'vitest'
import { registerOperator, setOperatorVerified } from '@/lib/operators-store'
import { createCharterSeries, cancelCharterSeries, listChartersByOperator } from '@/lib/charters-store'

const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => {
  for (const k of ['__pescaplusOperators', '__pescaplusCharters', '__pescaplusBookings']) g[k] = []
})

describe('publicar una serie de salidas', () => {
  async function verifiedOperator() {
    const op = await registerOperator({ name: 'P', email: 'p@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' })
    await setOperatorVerified(op.id, true)
    return op
  }
  const base = {
    spotSlug: 'tarifa', dateISO: '2030-08-03', timeStart: '07:30',
    modality: 'barco' as const, pricePerPerson: 120, maxPlaces: 4, minToConfirm: 1,
  }

  it('crea una salida por fecha, todas con el mismo seriesId', async () => {
    const op = await verifiedOperator()
    const { charters } = await createCharterSeries(op.id, op.manageToken, base, { weekdays: [6], untilISO: '2030-08-24' })
    expect(charters).toHaveLength(4)
    expect(charters.map((c) => c.dateISO)).toEqual(['2030-08-03', '2030-08-10', '2030-08-17', '2030-08-24'])
    const ids = new Set(charters.map((c) => c.seriesId))
    expect(ids.size).toBe(1)
    expect([...ids][0]).toBeTruthy()
    // Cada una es reservable por separado.
    expect(new Set(charters.map((c) => c.id)).size).toBe(4)
  })

  it('una sola fecha no genera serie (no se ofrece cancelar la serie)', async () => {
    const op = await verifiedOperator()
    const { charters } = await createCharterSeries(op.id, op.manageToken, base, null)
    expect(charters).toHaveLength(1)
    expect(charters[0].seriesId).toBe('')
  })

  it('cancelar la serie cancela todas las salidas vivas', async () => {
    const op = await verifiedOperator()
    const { charters } = await createCharterSeries(op.id, op.manageToken, base, { weekdays: [6], untilISO: '2030-08-24' })
    const seriesId = charters[0].seriesId

    expect(await cancelCharterSeries(seriesId, op.id, op.manageToken)).toBe(4)
    const after = await listChartersByOperator(op.id)
    expect(after.every((c) => c.status === 'cancelled')).toBe(true)
    // Idempotente: ya no queda ninguna viva.
    expect(await cancelCharterSeries(seriesId, op.id, op.manageToken)).toBe(0)
    // Token equivocado no cancela nada.
    expect(await cancelCharterSeries(seriesId, op.id, 'malo')).toBe(0)
  })

  it('un operador sin verificar no puede publicar una serie', async () => {
    const op = await registerOperator({ name: 'P2', email: 'p2@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' })
    await expect(createCharterSeries(op.id, op.manageToken, base, { weekdays: [6], untilISO: '2030-08-24' }))
      .rejects.toThrow(/verificad/i)
  })
})
