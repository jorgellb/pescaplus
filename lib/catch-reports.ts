import { isDatabaseConfigured } from '@/lib/products-store'
import { getSpot } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'
import { todayMadridISO, addDaysISO } from '@/lib/solunar-format'

/**
 * Shared catches — the one thing a weather model can't tell you: what is
 * actually being caught right now, here.
 *
 * The diary stays private in the browser; sharing is a separate, deliberate
 * act, and only structured fields travel (zone, species, day, count). Three
 * rules keep it honest and keep anglers willing to contribute:
 *
 *  1. NEVER a coordinate — the unit is the zone, which is already public.
 *  2. NEVER the diary note — free text is where a secret spot leaks.
 *  3. Nothing is shown below MIN_REPORTS. One report isn't a trend, and a
 *     lone data point in a small zone is identifiable by whoever was there.
 */
export const RECENT_DAYS = 21
export const MIN_REPORTS = 3

export interface CatchInput {
  spotSlug: string
  speciesId: string
  dateISO: string
  qty?: number
  /** Punto exacto, cuando se apunta desde la carta. */
  lat?: number | null
  lon?: number | null
  /** Hora local "HH:MM". Sin ella la marea de la captura es orientativa. */
  timeISO?: string | null
  /** Con qué picó (señuelo, cebo). Texto libre corto, opcional. */
  lure?: string | null
  /** Cómo se pescaba (spinning, surfcasting…). Opcional. */
  technique?: string | null
}

export interface SpeciesActivity {
  speciesId: string
  name: string
  /** Reports mentioning this species in the window. */
  reports: number
  /** Fish logged (reports can carry several). */
  fish: number
  /** Share of the window's reports, 0-100. */
  share: number
}

export interface SpotActivity {
  spotSlug: string
  /** Whether there's enough data to show anything at all. */
  enough: boolean
  reports: number
  days: number
  species: SpeciesActivity[]
  /** Most recent day with a report (ISO), for "última captura". */
  lastDateISO: string | null
}

interface StoredCatch { spotSlug: string; speciesId: string; dateISO: string; qty: number; userId: string | null; createdAt: number }
const g = globalThis as unknown as { __pescaplusCatches?: StoredCatch[] }
function mem() { return (g.__pescaplusCatches ??= []) }

const ISO = /^\d{4}-\d{2}-\d{2}$/

/** Validate against the real catalogues; a made-up zone or species never lands. */
export function validateCatch(input: CatchInput): string | null {
  if (!getSpot(input.spotSlug)) return 'Zona no válida.'
  if (!SEA_SPECIES.some((s) => s.id === input.speciesId)) return 'Especie no válida.'
  if (!ISO.test(input.dateISO ?? '')) return 'Fecha no válida.'
  const today = todayMadridISO()
  if (input.dateISO > today) return 'Esa fecha aún no ha llegado.'
  // Compartir una captura de hace dos años no aporta nada a "qué se pesca ahora".
  if (input.dateISO < addDaysISO(today, -365)) return 'Solo se comparten capturas del último año.'
  return null
}

export async function shareCatch(input: CatchInput, userId?: string | null): Promise<void> {
  const err = validateCatch(input)
  if (err) throw new Error(err)
  const qty = Math.min(200, Math.max(1, Math.round(Number(input.qty) || 1)))

  /*
   * El punto: el que se pase, y si no el de la zona.
   *
   * Sellar con el centro de la zona no es lo mismo que sellar con el sitio
   * exacto —el fondo puede cambiar de roca a arena en cien metros— pero permite
   * que las capturas apuntadas desde el diario, sin carta delante, tengan
   * contexto igualmente. Se distingue con `puntoExacto`.
   */
  const spot = getSpot(input.spotSlug)!
  const exacto = Number.isFinite(input.lat) && Number.isFinite(input.lon)
    && Math.abs(input.lat!) <= 90 && Math.abs(input.lon!) <= 180
  const lat = exacto ? input.lat! : spot.lat
  const lon = exacto ? input.lon! : spot.lon
  const timeISO = input.timeISO && /^\d{2}:\d{2}$/.test(input.timeISO) ? input.timeISO : null

  /*
   * La foto de condiciones NO puede impedir apuntar una captura. Si las fuentes
   * están caídas se guarda sin ella: perder el registro por no poder consultar
   * el viento sería absurdo.
   */
  /*
   * El sello solo se construye si hay base de datos.
   *
   * Sin ella estamos en el camino de memoria —pruebas y demo—, donde la captura
   * no se persiste en ningún sitio y las cuatro llamadas de red no aportan nada.
   * Peor: colgaban la suite de pruebas esperando a EMODnet y a Open-Meteo, con
   * fallos intermitentes según lo rápido que estuviera cada servicio ese día.
   * Una prueba unitaria no debe salir a internet.
   */
  let context: object | null = null
  if (isDatabaseConfigured()) {
    try {
      const { buildCatchContext } = await import('@/lib/catch-context')
      context = { ...(await buildCatchContext(lat, lon, input.dateISO, timeISO)), puntoExacto: exacto }
    } catch (error) {
      console.warn('No se ha podido sellar la captura con sus condiciones:', error)
    }
  }

  // Texto libre, pero acotado: es dato de comunidad, no un campo de notas.
  const limpiar = (v: string | null | undefined, max: number) => {
    const s = (v ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
    return s.length >= 2 ? s : null
  }
  const lure = limpiar(input.lure, 60)
  const technique = limpiar(input.technique, 40)

  const row = {
    spotSlug: input.spotSlug, speciesId: input.speciesId, dateISO: input.dateISO, qty,
    userId: userId ?? null,
    ...(exacto ? { lat, lon } : {}),
    ...(timeISO ? { timeISO } : {}),
    ...(lure ? { lure } : {}),
    ...(technique ? { technique } : {}),
    ...(context ? { context } : {}),
  }

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.catchReport.create({ data: row })
      return
    } catch (error) {
      console.error('Catch report write failed:', error)
      throw new Error('No se ha podido compartir la captura. Inténtalo de nuevo.')
    }
  }
  mem().push({ ...row, createdAt: Date.now() })
}

function aggregate(rows: { speciesId: string; qty: number; dateISO: string }[], spotSlug: string): SpotActivity {
  const total = rows.length
  if (total < MIN_REPORTS) {
    return { spotSlug, enough: false, reports: total, days: RECENT_DAYS, species: [], lastDateISO: null }
  }
  const byId = new Map<string, { reports: number; fish: number }>()
  let last = ''
  for (const r of rows) {
    const cur = byId.get(r.speciesId) ?? { reports: 0, fish: 0 }
    cur.reports += 1
    cur.fish += r.qty
    byId.set(r.speciesId, cur)
    if (r.dateISO > last) last = r.dateISO
  }
  const species: SpeciesActivity[] = [...byId.entries()]
    .map(([speciesId, v]) => ({
      speciesId,
      name: SEA_SPECIES.find((s) => s.id === speciesId)?.name ?? speciesId,
      reports: v.reports,
      fish: v.fish,
      share: Math.round((v.reports / total) * 100),
    }))
    .sort((a, b) => b.reports - a.reports || b.fish - a.fish)

  return { spotSlug, enough: true, reports: total, days: RECENT_DAYS, species, lastDateISO: last || null }
}

/** What's been caught in a zone lately. Returns `enough: false` below threshold. */
export async function getSpotActivity(spotSlug: string, days = RECENT_DAYS): Promise<SpotActivity> {
  const from = addDaysISO(todayMadridISO(), -days)
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.catchReport.findMany({
        where: { spotSlug, dateISO: { gte: from } },
        select: { speciesId: true, qty: true, dateISO: true },
        take: 1000,
      })
      return aggregate(rows, spotSlug)
    } catch (error) {
      console.warn('Catch activity read failed:', error)
      return { spotSlug, enough: false, reports: 0, days, species: [], lastDateISO: null }
    }
  }
  return aggregate(mem().filter((r) => r.spotSlug === spotSlug && r.dateISO >= from), spotSlug)
}

/** Same window, narrowed to one species — for the species × zone pages. */
export async function getSpeciesActivity(spotSlug: string, speciesId: string, days = RECENT_DAYS): Promise<{
  enough: boolean; reports: number; fish: number; lastDateISO: string | null
}> {
  const all = await getSpotActivity(spotSlug, days)
  const found = all.species.find((s) => s.speciesId === speciesId)
  // El umbral se aplica sobre el total de la zona, no sobre la especie: si ya
  // hay actividad suficiente, decir "y de estas 2 son lubinas" no identifica.
  if (!all.enough || !found) return { enough: false, reports: 0, fish: 0, lastDateISO: null }
  return { enough: true, reports: found.reports, fish: found.fish, lastDateISO: all.lastDateISO }
}

export interface LureTip {
  /** Con qué picó, tal cual lo escribió quien lo compartió. */
  lure: string
  /** Cuántos partes lo mencionan. */
  reports: number
}

/**
 * Con qué está picando en una zona (y opcionalmente una especie).
 *
 * Es lo que convierte los partes en algo accionable: "en Tarifa entra la
 * lubina" informa poco; "entra con vinilo de 10 cm" cambia la salida.
 *
 * Mismas reglas de privacidad que el resto de agregados: hace falta el mínimo
 * de partes de la ZONA para enseñar nada, y además cada cebo concreto necesita
 * al menos dos menciones. Un cebo mencionado una sola vez es, en la práctica,
 * una persona identificable contando lo que llevaba.
 */
export async function getLureTips(
  spotSlug: string,
  speciesId?: string | null,
  days = RECENT_DAYS,
  max = 4,
): Promise<LureTip[]> {
  if (!isDatabaseConfigured()) return []
  const all = await getSpotActivity(spotSlug, days)
  if (!all.enough) return []

  const from = addDaysISO(todayMadridISO(), -days)
  try {
    const { prisma } = await import('@/lib/prisma')
    const rows = await prisma.catchReport.findMany({
      where: {
        spotSlug,
        dateISO: { gte: from },
        lure: { not: null },
        ...(speciesId ? { speciesId } : {}),
      },
      select: { lure: true },
    })

    // Se agrupa sin distinguir mayúsculas ni acentos ("Vinilo" = "vinilo"),
    // pero se enseña la forma más usada, que es como lo escribe la gente.
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const byKey = new Map<string, { count: number; forms: Map<string, number> }>()
    for (const r of rows) {
      const raw = (r.lure ?? '').trim()
      if (raw.length < 2) continue
      const k = norm(raw)
      const e = byKey.get(k) ?? { count: 0, forms: new Map() }
      e.count += 1
      e.forms.set(raw, (e.forms.get(raw) ?? 0) + 1)
      byKey.set(k, e)
    }

    return [...byKey.values()]
      .filter((e) => e.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, max)
      .map((e) => ({
        lure: [...e.forms.entries()].sort((a, b) => b[1] - a[1])[0][0],
        reports: e.count,
      }))
  } catch (error) {
    console.warn('No se han podido leer los cebos de la zona:', error)
    return []
  }
}

/**
 * Las capturas SELLADAS de un usuario, para calcular sus patrones.
 *
 * Solo suyas y solo las que tienen contexto: sin él no se puede sacar ningún
 * patrón, y arrastrarlas solo sirve para inflar el recuento y dar una falsa
 * sensación de que hay datos.
 */
export async function listUserCatchesWithContext(userId: string, days = 730) {
  if (!userId || !isDatabaseConfigured()) return []
  const desde = addDaysISO(todayMadridISO(), -days)
  try {
    const { prisma } = await import('@/lib/prisma')
    const rows = await prisma.catchReport.findMany({
      // El "sin contexto" se filtra abajo y no aquí: en Prisma, comparar una
      // columna JSON con null exige `Prisma.DbNull`, y no compensa importarlo
      // para algo que la propia lectura ya descarta.
      where: { userId, dateISO: { gte: desde } },
      orderBy: { dateISO: 'desc' },
      take: 3000,
    })
    return rows
      .filter((r) => r.context && typeof r.context === 'object')
      .map((r) => ({
        speciesId: r.speciesId,
        dateISO: r.dateISO,
        qty: r.qty,
        context: r.context as unknown as import('@/lib/catch-context').CatchContext & { puntoExacto?: boolean },
      }))
  } catch (error) {
    console.warn('Catches with context read failed:', error)
    return []
  }
}

export interface UserSpotCatches {
  count: number
  lastDateISO: string
  topSpeciesIds: string[]
}

/**
 * Resumen personal de lo que TÚ has compartido en esta zona — no confundir
 * con `getSpotActivity` (agregado de toda la comunidad). El diario en sí
 * sigue viviendo solo en el navegador; esto solo ve lo que ya decidiste
 * compartir, igual que el resto del sistema de capturas.
 */
export async function getUserSpotCatches(userId: string, spotSlug: string, days = 730): Promise<UserSpotCatches | null> {
  if (!userId || !isDatabaseConfigured()) return null
  const desde = addDaysISO(todayMadridISO(), -days)
  try {
    const { prisma } = await import('@/lib/prisma')
    const rows = await prisma.catchReport.findMany({
      where: { userId, spotSlug, dateISO: { gte: desde } },
      orderBy: { dateISO: 'desc' },
      select: { speciesId: true, dateISO: true, qty: true },
    })
    if (rows.length === 0) return null
    const bySpecies = new Map<string, number>()
    for (const r of rows) bySpecies.set(r.speciesId, (bySpecies.get(r.speciesId) ?? 0) + r.qty)
    const topSpeciesIds = [...bySpecies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id)
    return { count: rows.length, lastDateISO: rows[0].dateISO, topSpeciesIds }
  } catch (error) {
    console.warn('User spot catches read failed:', error)
    return null
  }
}
