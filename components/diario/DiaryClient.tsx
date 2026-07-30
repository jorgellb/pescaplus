'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FISHING_SPOTS, getSpot } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'
import Icon from '@/components/icons/Icon'
import SpeciesPatterns from './SpeciesPatterns'
import { solunarDay, phaseIcon } from '@/lib/solunar'
import { tideCoefficient } from '@/lib/tides'
import { todayMadridISO, fmtDateLong } from '@/lib/solunar-format'

/**
 * Catch diary — everything stays in the browser (localStorage), nothing is
 * sent anywhere. The solunar engine is pure math, so each catch gets its
 * astronomical context (activity, moon phase, estimated tide coefficient)
 * computed locally, and with 3+ catches we surface the angler's own patterns.
 */
const KEY = 'pescaplus-diario'
/** Ids ya compartidos: compartir es opt-in y no debe repetirse. */
const SHARED_KEY = 'pescaplus-diario-compartidas'

interface CatchEntry {
  id: string
  dateISO: string
  /**
   * Hora local "HH:MM". Sin ella no se puede casar una captura con la marea ni
   * con la actividad solunar de ESE momento, que es justo lo que hace que el
   * diario enseñe algo en vez de acumular filas.
   */
  timeISO?: string
  spotSlug: string
  speciesId: string
  qty: number
  /**
   * Con qué picó. A diferencia de la nota, este SÍ viaja al compartir: es el
   * dato que hace útil el agregado de la zona ("aquí entra con vinilo de
   * 10 cm"). Por eso va en su propio campo y no dentro de la nota libre, donde
   * se mezclaría con lo que nadie quiere publicar.
   */
  lure?: string
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
  const [shared, setShared] = useState<string[]>([])
  const [sharing, setSharing] = useState<string | null>(null)
  const [identifying, setIdentifying] = useState(false)
  const [idNote, setIdNote] = useState('')

  /**
   * Identificar la especie desde una foto.
   *
   * La foto se REDUCE en el navegador antes de enviarla, y no es un detalle de
   * rendimiento: con la original (200 KB y más) el proveedor devolvía 429 y no
   * identificaba nada; a 640 px responde en un par de segundos. Además así no
   * se sube por la red una foto de 12 MP para acabar preguntando "¿qué pez es?".
   *
   * Lo que vuelve es una SUGERENCIA: rellena el selector y quien apunta la
   * captura la confirma. Nunca se guarda sola.
   */
  const identify = async (file: File) => {
    setIdentifying(true)
    setIdNote('')
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          URL.revokeObjectURL(url)
          const lado = 640
          const escala = Math.min(1, lado / Math.max(img.width, img.height))
          const c = document.createElement('canvas')
          c.width = Math.round(img.width * escala)
          c.height = Math.round(img.height * escala)
          const ctx = c.getContext('2d')
          if (!ctx) { reject(new Error('sin canvas')); return }
          ctx.drawImage(img, 0, 0, c.width, c.height)
          resolve(c.toDataURL('image/jpeg', 0.8))
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('no es una imagen')) }
        img.src = url
      })

      const res = await fetch('/api/capturas/identificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setIdNote(data.error ?? 'No se ha podido identificar.')
        return
      }
      if (!data.guess) {
        setIdNote('No la reconozco con seguridad. Elígela a mano.')
        return
      }
      setForm((f) => ({ ...f, speciesId: data.guess.speciesId }))
      setIdNote(
        data.guess.confidence === 'alta'
          ? `Parece ${data.guess.name}. Confírmalo.`
          : `Quizá ${data.guess.name} (poca seguridad). Confírmalo.`,
      )
    } catch {
      setIdNote('No se ha podido leer la foto.')
    } finally {
      setIdentifying(false)
    }
  }

  /**
   * Compartir una captura: viajan solo zona, especie, día y cantidad. La nota
   * se queda SIEMPRE en el navegador — es texto libre y ahí es donde se escapa
   * un punto concreto, que es justo lo que nadie quiere publicar.
   */
  const share = async (e: CatchEntry) => {
    setSharing(e.id)
    try {
      const res = await fetch('/api/capturas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // La hora va si se anotó: con ella la captura se sella con la marea y
        // la actividad de ese momento, no con las del mediodía por defecto.
        body: JSON.stringify({
          spotSlug: e.spotSlug, speciesId: e.speciesId, dateISO: e.dateISO, qty: e.qty,
          ...(e.timeISO ? { timeISO: e.timeISO } : {}),
          ...(e.lure ? { lure: e.lure } : {}),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const next = [...shared, e.id]
        setShared(next)
        try { localStorage.setItem(SHARED_KEY, JSON.stringify(next)) } catch { /* almacenamiento lleno */ }
      }
    } catch { /* sin red: se puede reintentar */ } finally { setSharing(null) }
  }
  const [ready, setReady] = useState(false)
  const [form, setForm] = useState({ dateISO: '', timeISO: '', spotSlug: '', speciesId: 'lubina', qty: 1, lure: '', note: '' })

  useEffect(() => {
    const init = () => {
      setEntries(load())
      try {
        const raw = localStorage.getItem(SHARED_KEY)
        if (raw) setShared(JSON.parse(raw) as string[])
      } catch { /* almacenamiento bloqueado: se podrá recompartir */ }
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
      // La hora es opcional: quien no la recuerde no debe quedarse sin apuntar
      // la captura. Lo que no se sabe se queda fuera, no se rellena.
      ...(/^\d{2}:\d{2}$/.test(form.timeISO) ? { timeISO: form.timeISO } : {}),
      spotSlug: form.spotSlug,
      speciesId: form.speciesId,
      qty: Math.max(1, Math.round(form.qty)),
      ...(form.lure.trim() ? { lure: form.lure.trim().slice(0, 60) } : {}),
      note: form.note.trim().slice(0, 200),
    }
    const next = [entry, ...entries]
    setEntries(next)
    save(next)
    setForm((f) => ({ ...f, lure: '', note: '' }))
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

  if (!ready) return <div className="border border-ink/10 rounded-2xl bg-paper p-6 text-sm text-ink/60">Cargando tu diario…</div>

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="border border-ink/10 rounded-2xl bg-paper shadow-hard p-4 sm:p-5 space-y-3">
        <h2 className="font-display uppercase text-xl leading-none inline-flex items-center gap-2"><Icon name="plus" className="w-5 h-5" strokeWidth={2} />Apunta una captura</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">Día</span>
            <input
              type="date"
              value={form.dateISO}
              max={todayMadridISO()}
              onChange={(ev) => setForm((f) => ({ ...f, dateISO: ev.target.value }))}
              className="mt-1 w-full border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">Hora</span>
            <input
              type="time"
              value={form.timeISO ?? ''}
              onChange={(ev) => setForm((f) => ({ ...f, timeISO: ev.target.value }))}
              className="mt-1 w-full border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">Zona</span>
            <select
              value={form.spotSlug}
              onChange={(ev) => setForm((f) => ({ ...f, spotSlug: ev.target.value }))}
              className="mt-1 w-full border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm"
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
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">Especie</span>
            <select
              value={form.speciesId}
              onChange={(ev) => setForm((f) => ({ ...f, speciesId: ev.target.value }))}
              className="mt-1 w-full border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm"
            >
              {SEA_SPECIES.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
              <option value="otra">Otra</option>
            </select>
            {/*
              Atajo: en vez de buscar entre 29 especies, haz una foto. Es una
              SUGERENCIA — rellena el selector y la confirmas tú. La foto no se
              guarda en ningún sitio: se usa para preguntar y se descarta.
            */}
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent cursor-pointer hover:underline">
                <Icon name="image" className="w-3.5 h-3.5" strokeWidth={1.8} />
                {identifying ? 'Identificando…' : 'Identificar con una foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={identifying}
                  onChange={(ev) => {
                    const file = ev.target.files?.[0]
                    ev.target.value = ''
                    if (file) identify(file)
                  }}
                />
              </label>
              {idNote && <span className="text-[12px] text-ink/70">{idNote}</span>}
            </span>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">Piezas</span>
            <input
              type="number"
              min={1}
              max={99}
              value={form.qty}
              onChange={(ev) => setForm((f) => ({ ...f, qty: Number(ev.target.value) }))}
              className="mt-1 w-full border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm"
            />
          </label>
        </div>
        {/*
          El cebo sale de la nota y pasa a su propio campo: es lo ÚNICO de aquí
          que viaja al compartir, y mezclarlo con texto libre obligaba a elegir
          entre publicar la nota entera (donde la gente escribe el punto exacto)
          o perder el dato. Separados, se puede compartir el cebo sin arrastrar
          nada más.
        */}
        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">Con qué picó</span>
          <input
            type="text"
            value={form.lure}
            maxLength={60}
            placeholder="p. ej. vinilo de 10 cm, gusana, jig de 60 g"
            onChange={(ev) => setForm((f) => ({ ...f, lure: ev.target.value }))}
            className="mt-1 w-full border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm"
          />
          <span className="block text-[11px] text-ink/60 mt-1">
            Si compartes la captura, esto se suma al «con qué está picando» de la zona. Lo demás no sale de aquí.
          </span>
        </label>
        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">Nota privada (tamaño, detalles…)</span>
          <input
            type="text"
            value={form.note}
            maxLength={200}
            placeholder="p. ej. 42 cm, al amanecer con marea subiendo"
            onChange={(ev) => setForm((f) => ({ ...f, note: ev.target.value }))}
            className="mt-1 w-full border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={add}
          disabled={!form.dateISO || !form.spotSlug}
          className="inline-flex items-center gap-2 bg-accent text-paper px-5 py-2.5 text-sm font-semibold border border-accent rounded-full shadow-hard hover-shift hover:bg-ink hover:border-ink disabled:opacity-50 transition-colors"
        >
          Guardar captura
        </button>
      </div>

      {/* Patterns */}
      {analysis && (
        <div className="border border-accent/30 rounded-2xl bg-accent/[0.04] p-4 sm:p-5 space-y-2">
          <h2 className="font-display uppercase text-xl leading-none inline-flex items-center gap-2"><Icon name="chartBar" className="w-5 h-5" strokeWidth={1.8} />Tus patrones ({analysis.n} capturas)</h2>
          <ul className="text-[15px] text-ink/85 leading-relaxed space-y-1">
            <li>
              <Icon name="moon" className="w-4 h-4 inline -mt-0.5" strokeWidth={1.8} /> El <strong>{analysis.topPhasePct}%</strong> de tus capturas fueron con <strong>{analysis.topPhase}</strong>.
            </li>
            <li>
              <Icon name="chartUp" className="w-4 h-4 inline -mt-0.5" strokeWidth={1.8} /> La actividad solunar media de tus días de pesca es <strong>{analysis.meanRating}/5</strong>
              {analysis.meanRating >= 3.5 ? ' — sales los días buenos, se nota.' : ' — prueba a elegir días de 4–5 en el planificador.'}
            </li>
            <li>
              <Icon name="wave" className="w-4 h-4 inline -mt-0.5" strokeWidth={1.8} /> El <strong>{analysis.bigCoefPct}%</strong> con coeficiente de marea alto (≥70).
            </li>
            <li>
              <Icon name="fish" className="w-4 h-4 inline -mt-0.5" strokeWidth={1.8} /> Tu especie estrella: <strong>{analysis.topSpecies}</strong> · tu zona: <strong>{analysis.topSpot}</strong> ({analysis.topSpotCount} salidas).
            </li>
          </ul>
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink/60">
            Contexto astronómico calculado en tu navegador · tus datos no salen de aquí
          </p>
        </div>
      )}

      {/* Los patrones por especie salen de las capturas COMPARTIDAS y del
          servidor; los de arriba, del diario local que no sale del navegador.
          Van separados a propósito: mezclarlos confundiría de dónde viene cada
          cosa y qué promesa de privacidad aplica a cada una. */}
      <SpeciesPatterns />

      {/* Entries */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display uppercase text-xl leading-none inline-flex items-center gap-2"><Icon name="rod" className="w-5 h-5" strokeWidth={1.8} />Tus capturas</h2>
          {entries.length > 0 && (
            <button onClick={exportJson} className="text-[11px] text-accent hover:underline">
              <Icon name="download" className="w-3.5 h-3.5 inline -mt-0.5" strokeWidth={2} /> Exportar copia (JSON)
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-ink/60 border border-ink/[0.07] rounded-2xl p-5 bg-paper">
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
                <li key={e.id} className="border border-ink/[0.07] rounded-xl bg-paper px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink text-sm">
                      {e.qty > 1 ? `${e.qty}× ` : ''}
                      {sp?.name ?? 'Captura'} · {spot?.name ?? e.spotSlug}
                    </span>
                    <span className="block font-mono text-[10px] uppercase tracking-widest text-ink/60">
                      {fmtDateLong(e.dateISO)}
                      {c ? <> · <Icon name={phaseIcon(c.phase)} className="w-3 h-3 inline -mt-0.5" /> {PHASE_LABEL[c.phaseBucket]} · actividad {c.rating}/5 · coef {c.coef}</> : ''}
                    </span>
                    {e.note && <span className="block text-[13px] text-ink/70 mt-0.5">{e.note}</span>}
                  </span>
                  {shared.includes(e.id) ? (
                    <span className="text-[12px] font-semibold text-accent" title="Compartida de forma anónima"><Icon name="check" className="w-3.5 h-3.5 inline -mt-0.5" strokeWidth={2.2} /> Compartida</span>
                  ) : (
                    <button
                      onClick={() => share(e)}
                      disabled={sharing === e.id}
                      title="Comparte zona, especie, día y cantidad. Tu nota nunca sale de aquí."
                      className="text-[12px] font-semibold text-accent hover:underline disabled:opacity-50"
                    >
                      {sharing === e.id ? 'Compartiendo…' : 'Compartir anónimamente'}
                    </button>
                  )}
                  <button
                    onClick={() => remove(e.id)}
                    aria-label="Borrar captura"
                    className="text-[12px] text-ink/60 hover:text-red-700"
                  >
                    Borrar
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="text-[12px] text-ink/60 leading-relaxed">
        Consejo: apunta también las salidas sin pesca — el contraste es lo que revela patrones de verdad. Y elige el
        próximo día bueno en el <Link href="/mejores-horas" className="text-accent underline">calendario de tu zona</Link>.
      </p>
    </div>
  )
}
