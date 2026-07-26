'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CharterIcon from './CharterIcon'
import ChipSelect from './ChipSelect'
import { TECHNIQUES, TARGET_SPECIES, FISHING_AREAS, TRIP_TYPES } from '@/lib/charter-options'
import { filterToQuery, type CharterFilter } from '@/lib/charter-filters'

interface Opt { slug: string; name: string }

/**
 * Charter search bar. State lives in the URL, not in the component, so a
 * filtered view can be shared, bookmarked and reached with the back button —
 * the server renders the results, this only builds the query.
 */
export default function CharterFilters({ initial, spots, resultCount }: {
  initial: CharterFilter; spots: Opt[]; resultCount: number
}) {
  const router = useRouter()
  const [f, setF] = useState<CharterFilter>(initial)
  const [open, setOpen] = useState(
    initial.techniques.length > 0 || initial.species.length > 0 || initial.areas.length > 0 || !!initial.maxPrice,
  )
  const set = <K extends keyof CharterFilter>(k: K, v: CharterFilter[K]) => setF((s) => ({ ...s, [k]: v }))

  const apply = (next: CharterFilter = f) => router.push(`/charters${filterToQuery(next)}`)
  const clear = () => router.push('/charters')

  const active = [
    f.spotSlug, f.fromISO, f.untilISO, f.tripType, f.q, f.maxPrice,
    ...f.techniques, ...f.species, ...f.areas,
  ].filter(Boolean).length

  const L = 'text-[12px] font-semibold uppercase tracking-wide text-ink/50'
  const I = 'mt-1 w-full border border-ink/[0.07] rounded-xl bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-accent'

  return (
    <form onSubmit={(e) => { e.preventDefault(); apply() }}
      className="border border-ink/[0.07] rounded-2xl bg-paper p-4 sm:p-5 space-y-4 shadow-hard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block"><span className={L}>Buscar</span>
          <input value={f.q} onChange={(e) => set('q', e.target.value)} maxLength={80}
            placeholder="atún, Tarifa, nombre del barco…" className={I} /></label>
        <label className="block"><span className={L}>Zona</span>
          <select value={f.spotSlug} onChange={(e) => set('spotSlug', e.target.value)} className={I}>
            <option value="">Cualquier zona</option>
            {spots.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select></label>
        <label className="block"><span className={L}>Desde</span>
          <input type="date" value={f.fromISO} onChange={(e) => set('fromISO', e.target.value)} className={I} /></label>
        <label className="block"><span className={L}>Hasta</span>
          <input type="date" value={f.untilISO} onChange={(e) => set('untilISO', e.target.value)} className={I} /></label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit"
          className="bg-accent text-paper px-5 py-2.5 text-sm font-semibold rounded-full hover:brightness-110 transition-all">
          Buscar{resultCount >= 0 ? '' : ''}
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          <CharterIcon name="rod" className="w-4 h-4" />
          {open ? 'Menos filtros' : 'Más filtros'}
        </button>
        {active > 0 && (
          <button type="button" onClick={clear} className="text-sm font-medium text-ink/50 hover:text-red-700">
            Limpiar ({active})
          </button>
        )}
        <span className="ml-auto text-sm text-ink/55">
          {resultCount} {resultCount === 1 ? 'salida' : 'salidas'}
        </span>
      </div>

      {open && (
        <div className="space-y-5 border-t border-ink/[0.07] pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <label className="block"><span className={L}>Tipo de salida</span>
              <select value={f.tripType} onChange={(e) => set('tripType', e.target.value as CharterFilter['tripType'])} className={I}>
                <option value="">Cualquiera</option>
                {TRIP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select></label>
            <label className="block"><span className={L}>Precio máximo por persona</span>
              <input type="number" min={1} max={5000} value={f.maxPrice ?? ''}
                onChange={(e) => set('maxPrice', e.target.value ? Number(e.target.value) : null)}
                placeholder="sin límite" className={I} /></label>
          </div>
          <ChipSelect label="Técnica" icon="rod" options={TECHNIQUES}
            value={f.techniques} onChange={(v) => set('techniques', v)} />
          <ChipSelect label="Especie objetivo" icon="fish" options={TARGET_SPECIES}
            value={f.species} onChange={(v) => set('species', v)} collapseAfter={10} />
          <ChipSelect label="Zona de pesca" icon="offshore" options={FISHING_AREAS}
            value={f.areas} onChange={(v) => set('areas', v)} />
          <button type="submit"
            className="bg-accent text-paper px-5 py-2.5 text-sm font-semibold rounded-full hover:brightness-110 transition-all">
            Aplicar filtros
          </button>
        </div>
      )}
    </form>
  )
}
