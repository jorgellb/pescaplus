'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FISHING_SPOTS, getSpot } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'
import { solunarDay, phaseEmoji } from '@/lib/solunar'
import { tideCoefficient } from '@/lib/tides'
import { todayMadridISO, fmtDateLong } from '@/lib/solunar-format'

/**
 * Catch diary — everything stays in the browser (localStorage), nothing is
 * sent anywhere. The solunar engine is pure math, so each catch gets its
 * astronomical context (activity, moon phase, estimated tide coefficient)
 * computed locally, and with 3+ catches we surface the angler's own patterns.
 */
const KEY = 'pescaplus-diario'

interface CatchEntry {
  id: string
  dateISO: string
  spotSlug: string
  speciesId: string
  qty: number
  note: string
}

interface EntryContext {
  rating: number
  coef: number
  phase: number
  phaseBucket: 'nueva' | 'creciente' | 'llena' | 'menguante'
}

function phaseBucket(phase: number): EntryContext['phaseBucket'] {
  if (phase < 0.125 || phase >= 0.875) return 'nueva'
  if (phase < 0.375) return 'creciente'
  if (phase < 0.625) return 'llena'
  return 'menguante'
}

function contextFor(e: CatchEntry): EntryContext | null {
  const spot = getSpot(e.spotSlug)
  if (!spot || !/^\d{4}-\d{2}-\d{2}$/.test(e.dateISO)) return null
  const sol = solunarDay(spot.lat, spot.lon, e.dateISO)
  return { rating: sol.rating, coef: tideCoefficient(sol.moonPhase), phase: sol.moonPhase, phaseBucket: phaseBucket(sol.moonPhase) }
}

function load(): CatchEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as CatchEntry[]) : []
    if (!Array.isArray(list)) return []
    // Sanitise: a hand-edited or imported file must not break the pattern maths
    // (e.g. a huge qty skewing the sums), so clamp qty to a sane 1..99.
    return list
      .filter((e) => e && e.id && e.dateISO && e.spotSlug)
      .map((e) => ({ ...e, qty: Math.min(99, Math.max(1, Math.round(Number(e.qty) || 1))) }))
  } catch {
    return []
  }
}

function save(list: CatchEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* full/blocked storage: the UI state still holds the session's entries */
  }
}

const PHASE_LABEL: Record<EntryContext['phaseBucket'], string> = {
  nueva: 'luna nueva',
  creciente: 'creciente',
  llena: 'luna llena',
  menguante: 'menguante',
}

export default function DiaryClient() {
  const [entries, setEntries] = useState<CatchEntry[]>([])
  const [ready, setReady] = useState(false)
  const [form, setForm] = useState({ dateISO: '', spotSlug: '', speciesId: 'lubina', qty: 1, note: '' })

  useEffect(() => {
    const init = () => {
      setEntries(load())
      const params = new URLSearchParams(window.location.search)
      const zona = params.get('zona')
      setForm((f) => ({
        ...f,
        dateISO: todayMadridISO(),
        spotSlug: zona && getSpot(zona) ? zona : '',
      }))
      setReady(true)
    }
    init()
  }, [])

  const add = () => {
    if (!form.dateISO || !form.spotSlug) return
    const entry: CatchEntry = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dateISO: form.dateISO,
      spotSlug: form.spotSlug,
      speciesId: form.speciesId,
      qty: Math.max(1, Math.round(form.qty)),
      note: form.note.trim().slice(0, 200),
    }
    const next = [entry, ...entries]
    setEntries(next)
    save(next)
    setForm((f) => ({ ...f, note: '' }))
  }

  const remove = (id: string) => {
    const next = entries.filter((e) => e.id !== id)
    setEntries(next)
    save(next)
  }

  const contexts = useMemo(() => {
    const map = new Map<string, EntryContext>()
    for (const e of entries) {
      const c = contextFor(e)
      if (c) map.set(e.id, c)
    }
    return map
  }, [entries])

  const analysis = useMemo(() => {
    const withCtx = entries.map((e) => ({ e, c: contexts.get(e.id) })).filter((x): x is { e: CatchEntry; c: EntryContext } => !!x.c)
    if (withCtx.length < 3) return null
    const n = withCtx.length
    const phases = new Map<string, number>()
    let ratingSum = 0
    let bigCoef = 0
    const bySpecies = new Map<string, number>()
    const bySpot = new Map<string, number>()
    for (const { e, c } of withCtx) {
      phases.set(c.phaseBucket, (phases.get(c.phaseBucket) ?? 0) + 1)
      ratingSum += c.rating
      if (c.coef >= 70) bigCoef++
      bySpecies.set(e.speciesId, (bySpecies.get(e.speciesId) ?? 0) + e.qty)
      bySpot.set(e.spotSlug, (bySpot.get(e.spotSlug) ?? 0) + 1)
    }
    const topPhase = [...phases.entries()].sort((a, b) => b[1] - a[1])[0]
    const topSpecies = [...bySpecies.entries()].sort((a, b) => b[1] - a[1])[0]
    const topSpot = [...bySpot.entries()].sort((a, b) => b[1] - a[1])[0]
    return {
      n,
      topPhasePct: Math.round((topPhase[1] / n) * 100),
      topPhase: PHASE_LABEL[topPhase[0] as EntryContext['phaseBucket']],
      meanRating: Math.round((ratingSum / n) * 10) / 10,
      bigCoefPct: Math.round((bigCoef / n) * 100),
      topSpecies: SEA_SPECIES.find((s) => s.id === topSpecies[0])?.name ?? topSpecies[0],
      topSpot: getSpot(topSpot[0])?.name ?? topSpot[0],
      topSpotCount: topSpot[1],
    }
  }, [entries, contexts])

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pescaplus-diario-${todayMadridISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!ready) return <div className="border border-ink/15 rounded-2xl bg-paper p-6 text-sm text-ink/50">Cargando tu diario…</div>

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-4 sm:p-5 space-y-3">
        <h2 className="font-display uppercase text-xl leading-none">➕ Apunta una captura</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Día</span>
            <input
              type="date"
              value={form.dateISO}
              max={todayMadridISO()}
              onChange={(ev) => setForm((f) => ({ ...f, dateISO: ev.target.value }))}
              className="mt-1 w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Zona</span>
            <select
              value={form.spotSlug}
              onChange={(ev) => setForm((f) => ({ ...f, spotSlug: ev.target.value }))}
              className="mt-1 w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm"
            >
              <option value="">Elige zona…</option>
              {FISHING_SPOTS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name} ({s.region})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Especie</span>
            <select
              value={form.speciesId}
              onChange={(ev) => setForm((f) => ({ ...f, speciesId: ev.target.value }))}
              className="mt-1 w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm"
            >
              {SEA_SPECIES.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
              <option value="otra">Otra</option>
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Piezas</span>
            <input
              type="number"
              min={1}
              max={99}
              value={form.qty}
              onChange={(ev) => setForm((f) => ({ ...f, qty: Number(ev.target.value) }))}
              className="mt-1 w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Nota (cebo, técnica, tamaño…)</span>
          <input
            type="text"
            value={form.note}
            maxLength={200}
            placeholder="p. ej. sarda a la boya con coreano, amanecer"
            onChange={(ev) => setForm((f) => ({ ...f, note: ev.target.value }))}
            className="mt-1 w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={add}
          disabled={!form.dateISO || !form.spotSlug}
          className="inline-flex items-center gap-2 bg-accent text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide border border-accent rounded-xl shadow-hard hover-shift hover:bg-ink hover:border-ink disabled:opacity-50 transition-colors"
        >
          Guardar captura
        </button>
      </div>

      {/* Patterns */}
      {analysis && (
        <div className="border border-accent/30 rounded-2xl bg-accent/[0.04] p-4 sm:p-5 space-y-2">
          <h2 className="font-display uppercase text-xl leading-none">📊 Tus patrones ({analysis.n} capturas)</h2>
          <ul className="text-[15px] text-ink/85 leading-relaxed space-y-1">
            <li>
              🌙 El <strong>{analysis.topPhasePct}%</strong> de tus capturas fueron con <strong>{analysis.topPhase}</strong>.
            </li>
            <li>
              📈 La actividad solunar media de tus días de pesca es <strong>{analysis.meanRating}/5</strong>
              {analysis.meanRating >= 3.5 ? ' — sales los días buenos, se nota.' : ' — prueba a elegir días de 4–5 en el planificador.'}
            </li>
            <li>
              🌊 El <strong>{analysis.bigCoefPct}%</strong> con coeficiente de marea alto (≥70).
            </li>
            <li>
              🐟 Tu especie estrella: <strong>{analysis.topSpecies}</strong> · tu zona: <strong>{analysis.topSpot}</strong> ({analysis.topSpotCount} salidas).
            </li>
          </ul>
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink/40">
            Contexto astronómico calculado en tu navegador · tus datos no salen de aquí
          </p>
        </div>
      )}

      {/* Entries */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display uppercase text-xl leading-none">🎣 Tus capturas</h2>
          {entries.length > 0 && (
            <button onClick={exportJson} className="font-mono text-[11px] uppercase tracking-wide text-accent hover:underline">
              ⬇️ Exportar copia (JSON)
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-ink/55 border border-ink/12 rounded-2xl p-5 bg-paper">
            Aún no hay capturas. Apunta la primera y, a partir de tres, te enseñamos tus patrones: con qué luna, qué
            coeficiente y en qué zonas pescas mejor.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => {
              const spot = getSpot(e.spotSlug)
              const sp = SEA_SPECIES.find((x) => x.id === e.speciesId)
              const c = contexts.get(e.id)
              return (
                <li key={e.id} className="border border-ink/12 rounded-xl bg-paper px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink text-sm">
                      {e.qty > 1 ? `${e.qty}× ` : ''}
                      {sp?.name ?? 'Captura'} · {spot?.name ?? e.spotSlug}
                    </span>
                    <span className="block font-mono text-[10px] uppercase tracking-widest text-ink/45">
                      {fmtDateLong(e.dateISO)}
                      {c ? ` · ${phaseEmoji(c.phase)} ${PHASE_LABEL[c.phaseBucket]} · actividad ${c.rating}/5 · coef ${c.coef}` : ''}
                    </span>
                    {e.note && <span className="block text-[13px] text-ink/70 mt-0.5">{e.note}</span>}
                  </span>
                  <button
                    onClick={() => remove(e.id)}
                    aria-label="Borrar captura"
                    className="font-mono text-[11px] uppercase tracking-wide text-ink/40 hover:text-red-700"
                  >
                    Borrar
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="text-[12px] text-ink/50 leading-relaxed">
        Consejo: apunta también las salidas sin pesca — el contraste es lo que revela patrones de verdad. Y elige el
        próximo día bueno en el <Link href="/mejores-horas" className="text-accent underline">calendario de tu zona</Link>.
      </p>
    </div>
  )
}
