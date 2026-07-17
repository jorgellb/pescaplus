/**
 * One-off batch: real climatology per zone from the Open-Meteo ERA5 archive.
 * For every zone, 3 full years (2023–2025) of daily max wind → per-month mean
 * and % of "fishable" days (max wind ≤ 20 km/h). Output is committed as
 * content/zone-climate.json and served statically — zero runtime cost.
 *
 * The archive API weights big requests heavily, so: small chunks, long sleeps,
 * hard backoff on 429, incremental saving and resume (rerun to continue).
 *
 * Run: node --experimental-strip-types scripts/gen-zone-climate.ts
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { FISHING_SPOTS } from '../lib/fishing-spots.ts'

const START = '2023-01-01'
const END = '2025-12-31'
const YEARS_LABEL = '2023–2025'
const CHUNK = 10
const OUT = 'content/zone-climate.json'

interface MonthClimate {
  w: number
  ok: number
}

const zones: Record<string, MonthClimate[]> = existsSync(OUT)
  ? (JSON.parse(readFileSync(OUT, 'utf-8')) as { zones: Record<string, MonthClimate[]> }).zones
  : {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchChunk(spots: typeof FISHING_SPOTS): Promise<{ daily: { time: string[]; wind_speed_10m_max: (number | null)[] } }[]> {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${spots.map((s) => s.lat.toFixed(3)).join(',')}&longitude=${spots
    .map((s) => s.lon.toFixed(3))
    .join(',')}&start_date=${START}&end_date=${END}&daily=wind_speed_10m_max&timezone=auto&wind_speed_unit=kmh`
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) })
      if (res.status === 429) {
        console.error('  429 — espera larga')
        await sleep(90000)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return Array.isArray(data) ? data : [data]
    } catch (e) {
      console.error(`  intento ${attempt + 1} falló:`, (e as Error).message)
      await sleep(15000 * (attempt + 1))
    }
  }
  throw new Error('chunk agotado')
}

const pending = FISHING_SPOTS.filter((s) => !zones[s.slug])
console.log(`hechas ${FISHING_SPOTS.length - pending.length}, pendientes ${pending.length}`)

for (let i = 0; i < pending.length; i += CHUNK) {
  const chunk = pending.slice(i, i + CHUNK)
  console.log(`chunk ${i / CHUNK + 1}/${Math.ceil(pending.length / CHUNK)} (${chunk[0].slug}…)`)
  const results = await fetchChunk(chunk)
  chunk.forEach((spot, j) => {
    const d = results[j]?.daily
    if (!d?.time) return
    const sums = Array.from({ length: 12 }, () => ({ total: 0, calm: 0, n: 0 }))
    for (let k = 0; k < d.time.length; k++) {
      const v = d.wind_speed_10m_max[k]
      if (v == null) continue
      const m = Number(d.time[k].slice(5, 7)) - 1
      sums[m].total += v
      sums[m].n++
      if (v <= 20) sums[m].calm++
    }
    zones[spot.slug] = sums.map((s) => ({
      w: s.n ? Math.round((s.total / s.n) * 10) / 10 : 0,
      ok: s.n ? Math.round((s.calm / s.n) * 100) : 0,
    }))
  })
  writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), years: YEARS_LABEL, zones }))
  await sleep(20000)
}

console.log(`OK: ${Object.keys(zones).length}/${FISHING_SPOTS.length} zonas → ${OUT}`)
