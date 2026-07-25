'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ChipSelect from './ChipSelect'
import CharterIcon from './CharterIcon'
import {
  TECHNIQUES, TARGET_SPECIES, FISHING_AREAS, INCLUDED, EXCLUDED,
  POLICIES, SEASONS, LANGUAGES, TRIP_TYPES,
} from '@/lib/charter-options'

interface Opt { slug: string; name: string; region: string }

/**
 * "Publish a charter" — the long form. Split into steps so the patrón can fill
 * the essentials and stop: only the first block is required, everything else
 * enriches the listing (and listings with more detail convert better).
 */
export default function CharterForm({ operatorId, manageToken, defaultSpot, spots }: {
  operatorId: string; manageToken: string; defaultSpot: string; spots: Opt[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [openDetail, setOpenDetail] = useState(false)

  const [f, setF] = useState({
    spotSlug: defaultSpot, dateISO: '', timeStart: '08:00', durationH: 5,
    modality: 'barco', level: 'cualquiera',
    tripType: 'compartida', pricePerPerson: '', privatePrice: '',
    maxPlaces: 4, minToConfirm: 1,
    highlights: '', meetingPoint: '', notes: '',
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))

  const [sel, setSel] = useState<Record<string, string[]>>({
    techniques: [], species: [], areas: [], included: [], excluded: [],
    policies: [], seasons: [], languages: ['es'],
  })
  const pick = (k: string) => (next: string[]) => setSel((s) => ({ ...s, [k]: next }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/charters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId, manageToken,
          ...f,
          pricePerPerson: Number(f.pricePerPerson),
          privatePrice: f.tripType === 'privada' && f.privatePrice ? Number(f.privatePrice) : undefined,
          durationH: Number(f.durationH) || undefined,
          maxPlaces: Number(f.maxPlaces), minToConfirm: Number(f.minToConfirm),
          highlights: f.highlights || undefined,
          meetingPoint: f.meetingPoint || undefined,
          notes: f.notes || undefined,
          ...sel,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setMsg(data.error || 'No se pudo publicar.'); return }
      router.refresh()
      setF((s) => ({ ...s, dateISO: '', pricePerPerson: '', privatePrice: '', highlights: '', notes: '' }))
      setOpenDetail(false)
    } finally { setSaving(false) }
  }

  const L = 'text-[12px] font-semibold uppercase tracking-wide text-ink/50'
  const I = 'mt-1 w-full border border-ink/12 rounded-xl bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-accent'

  return (
    <form onSubmit={submit} className="border border-ink/[0.07] rounded-2xl bg-paper p-5 sm:p-6 space-y-6 shadow-hard">
      <div>
        <h2 className="font-display text-2xl text-ink">Publicar una salida</h2>
        <p className="text-[14px] text-ink/55 mt-1">Cuanto más detalles, más reservas: los pescadores comparan barco, técnicas y qué incluye el precio.</p>
      </div>

      {/* 1 · Lo esencial */}
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-accent">
          <span className="w-5 h-5 rounded-full bg-accent text-paper text-[11px] flex items-center justify-center">1</span>
          Lo esencial
        </p>
        <label className="block"><span className={L}>Título de la salida</span>
          <input value={f.highlights} onChange={(e) => set('highlights', e.target.value)} maxLength={120}
            placeholder="Ej.: Pesca del atún a curricán desde Tarifa" className={I} /></label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="block"><span className={L}>Zona *</span>
            <select required value={f.spotSlug} onChange={(e) => set('spotSlug', e.target.value)} className={I}>
              <option value="">Elige…</option>{spots.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select></label>
          <label className="block"><span className={L}>Día *</span>
            <input required type="date" value={f.dateISO} onChange={(e) => set('dateISO', e.target.value)} className={I} /></label>
          <label className="block"><span className={L}>Hora de salida *</span>
            <input required type="time" value={f.timeStart} onChange={(e) => set('timeStart', e.target.value)} className={I} /></label>
          <label className="block"><span className={L}>Duración (h)</span>
            <input type="number" min={1} max={24} step={0.5} value={f.durationH} onChange={(e) => set('durationH', Number(e.target.value))} className={I} /></label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="block"><span className={L}>Tipo de salida</span>
            <select value={f.tripType} onChange={(e) => set('tripType', e.target.value)} className={I}>
              {TRIP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select></label>
          <label className="block"><span className={L}>€/persona *</span>
            <input required type="number" min={1} max={5000} value={f.pricePerPerson} onChange={(e) => set('pricePerPerson', e.target.value)} className={I} /></label>
          {f.tripType === 'privada' && (
            <label className="block"><span className={L}>Precio barco completo</span>
              <input type="number" min={1} max={50000} value={f.privatePrice} onChange={(e) => set('privatePrice', e.target.value)} placeholder="opcional" className={I} /></label>
          )}
          <label className="block"><span className={L}>Plazas</span>
            <input type="number" min={1} max={50} value={f.maxPlaces} onChange={(e) => set('maxPlaces', Number(e.target.value))} className={I} /></label>
          <label className="block"><span className={L}>Mín. para salir</span>
            <input type="number" min={1} max={50} value={f.minToConfirm} onChange={(e) => set('minToConfirm', Number(e.target.value))} className={I} /></label>
        </div>

        <label className="block"><span className={L}>Punto de encuentro</span>
          <input value={f.meetingPoint} onChange={(e) => set('meetingPoint', e.target.value)} maxLength={200}
            placeholder="Ej.: Pantalán 3, Marina Deportiva del Puerto" className={I} /></label>
      </div>

      {/* 2 · Detalle (plegable) */}
      <div className="border-t border-ink/[0.07] pt-5">
        <button type="button" onClick={() => setOpenDetail((v) => !v)}
          className="w-full flex items-center justify-between gap-2 text-left">
          <span className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-accent">
            <span className="w-5 h-5 rounded-full bg-accent text-paper text-[11px] flex items-center justify-center">2</span>
            Detalle de la salida
            <span className="font-normal normal-case tracking-normal text-ink/45">— técnicas, especies, qué incluye…</span>
          </span>
          <CharterIcon name="check" className={`w-4 h-4 text-ink/40 transition-transform ${openDetail ? 'rotate-180' : ''}`} />
        </button>

        {openDetail && (
          <div className="space-y-6 mt-5">
            <label className="block"><span className={L}>Descripción</span>
              <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} maxLength={4000} rows={5}
                placeholder="Cómo es la jornada, a qué hora se zarpa, qué se pesca según el día, nivel necesario…" className={I} /></label>

            <ChipSelect label="Técnicas de pesca" hint="Qué modalidades practicaréis a bordo." icon="rod"
              options={TECHNIQUES} value={sel.techniques} onChange={pick('techniques')} />
            <ChipSelect label="Especies objetivo" hint="A qué vais a pescar según la temporada." icon="fish"
              options={TARGET_SPECIES} value={sel.species} onChange={pick('species')} collapseAfter={10} />
            <ChipSelect label="Zonas de pesca" hint="Dónde se pesca durante la salida." icon="offshore"
              options={FISHING_AREAS} value={sel.areas} onChange={pick('areas')} />
            <ChipSelect label="Incluido en el precio" hint="Lo que el pescador NO paga aparte." icon="check"
              options={INCLUDED} value={sel.included} onChange={pick('included')} />
            <ChipSelect label="No incluido" hint="Lo que debe traer o pagar aparte." icon="cross"
              options={EXCLUDED} value={sel.excluded} onChange={pick('excluded')} />
            <ChipSelect label="Normas a bordo" hint="Reglas de la embarcación." icon="shield"
              options={POLICIES} value={sel.policies} onChange={pick('policies')} />
            <ChipSelect label="Idiomas" hint="En qué idiomas atendéis." icon="language"
              options={LANGUAGES} value={sel.languages} onChange={pick('languages')} />
            <ChipSelect label="Temporada" hint="Meses en los que ofrecéis esta salida." icon="calendar"
              options={SEASONS} value={sel.seasons} onChange={pick('seasons')} />
          </div>
        )}
      </div>

      {msg && <p className="text-sm text-red-700">{msg}</p>}
      <button type="submit" disabled={saving}
        className="bg-accent text-paper px-6 py-3 text-[15px] font-semibold rounded-full hover:brightness-110 disabled:opacity-60 transition-all">
        {saving ? 'Publicando…' : 'Publicar salida'}
      </button>
    </form>
  )
}
