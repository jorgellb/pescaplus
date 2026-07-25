import { describe, it, expect, beforeEach } from 'vitest'
import {
  sanitizeIds, resolveOptions, TECHNIQUES, TARGET_SPECIES, NAVIGATION,
  TRIP_GROUPS, BOAT_GROUPS, INCLUDED, EXCLUDED,
} from '@/lib/charter-options'
import { registerOperator, setOperatorVerified, updateOperatorProfile } from '@/lib/operators-store'
import { createCharter, getCharter } from '@/lib/charters-store'

const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => {
  for (const k of ['__pescaplusOperators', '__pescaplusCharters', '__pescaplusBookings']) g[k] = []
})

describe('catálogo de opciones de chárter', () => {
  it('todas las opciones tienen id único e icono', () => {
    const groups = [...TRIP_GROUPS, ...BOAT_GROUPS]
    for (const grp of groups) {
      const ids = grp.options.map((o) => o.id)
      expect(new Set(ids).size, `ids duplicados en ${grp.id}`).toBe(ids.length)
      for (const o of grp.options) {
        expect(o.icon, `${grp.id}/${o.id} sin icono`).toBeTruthy()
        expect(o.label.length).toBeGreaterThan(1)
      }
    }
  })

  it('sanitizeIds descarta lo que no está en el catálogo y deduplica', () => {
    expect(sanitizeIds(TECHNIQUES, ['spinning', 'jigging', 'spinning', 'inventado'])).toEqual(['spinning', 'jigging'])
    expect(sanitizeIds(TECHNIQUES, 'no-es-array')).toEqual([])
    expect(sanitizeIds(TECHNIQUES, null)).toEqual([])
    // Respeta el tope.
    expect(sanitizeIds(TARGET_SPECIES, TARGET_SPECIES.map((o) => o.id), 3)).toHaveLength(3)
  })

  it('resolveOptions ignora ids desconocidos (las etiquetas pueden cambiar)', () => {
    const out = resolveOptions(NAVIGATION, ['gps', 'ya-no-existe', 'radar'])
    expect(out.map((o) => o.id)).toEqual(['gps', 'radar'])
  })

  it('incluido y no incluido no comparten ids (son listas distintas)', () => {
    const inc = new Set(INCLUDED.map((o) => o.id))
    for (const o of EXCLUDED) expect(inc.has(o.id), `${o.id} está en ambas`).toBe(false)
  })
})

describe('persistencia de la ficha detallada (memoria)', () => {
  it('guarda solo ids válidos del viaje y del barco', async () => {
    const op = await registerOperator({ name: 'P', email: 'p@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' })
    await setOperatorVerified(op.id, true)

    const charter = await createCharter(op.id, op.manageToken, {
      spotSlug: 'tarifa', dateISO: '2030-05-05', timeStart: '07:30', modality: 'barco',
      pricePerPerson: 90, maxPlaces: 4, minToConfirm: 1,
      tripType: 'privada', durationH: 5,
      techniques: ['spinning', 'jigging', 'basura'],
      species: ['atun-rojo', 'bacoreta', 'dragon'],
      included: ['patron', 'combustible'],
      policies: ['ninos'],
      languages: ['es', 'en', 'klingon'],
      meetingPoint: 'Pantalán 3',
      highlights: 'Pesca del atún al amanecer',
    })

    expect(charter.tripType).toBe('privada')
    expect(charter.techniques).toEqual(['spinning', 'jigging'])
    expect(charter.species).toEqual(['atun-rojo', 'bacoreta'])
    expect(charter.languages).toEqual(['es', 'en'])
    expect(charter.included).toEqual(['patron', 'combustible'])
    expect(charter.highlights).toBe('Pesca del atún al amanecer')

    // Vuelve a leerse igual desde el store.
    const again = await getCharter(charter.id)
    expect(again!.meetingPoint).toBe('Pantalán 3')
    expect(again!.durationH).toBe(5)

    // Y el barco, en el perfil del operador.
    const updated = await updateOperatorProfile(op.id, op.manageToken, {
      marina: 'Puerto de Tarifa', boatLength: 6.5, boatBeam: 2.55,
      boatEngineHp: 100, boatMaxSpeedKn: 20, boatYear: 2023, crewSize: 2,
      navigation: ['gps', 'radar', 'inventado'], safety: ['chalecos'],
    })
    expect(updated!.marina).toBe('Puerto de Tarifa')
    expect(updated!.boatLength).toBe(6.5)
    expect(updated!.navigation).toEqual(['gps', 'radar'])
    // Un numérico vaciado desde el formulario se guarda como null, no como 0.
    const cleared = await updateOperatorProfile(op.id, op.manageToken, { boatYear: '' })
    expect(cleared!.boatYear).toBeNull()
  })
})
