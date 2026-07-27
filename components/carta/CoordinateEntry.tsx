'use client'

import { useState } from 'react'
import { parseCoord, formatNautical } from '@/lib/marks-io'

/**
 * Entrada de coordenadas náuticas para llevar la carta a un punto concreto.
 *
 * Los campos van separados —grados, minutos, hemisferio— porque es como se leen
 * en el plotter y como se dictan por radio: "tres seis grados, cero cero coma
 * siete seis ocho minutos, Norte". Pedir grados decimales obligaría a hacer una
 * división mental a alguien que tiene el papel delante con la otra notación.
 *
 * Aun así se acepta pegar. Media flota se pasa los caladeros por WhatsApp en el
 * formato que sea, y si alguien pega "36°00.768'N 5°36.336'W" en el primer
 * hueco se reparte solo entre los campos en vez de darle un error.
 */
export interface CoordFields {
  latG: string; latM: string; latH: 'N' | 'S'
  lonG: string; lonM: string; lonH: 'E' | 'O'
}

const VACIO: CoordFields = { latG: '', latM: '', latH: 'N', lonG: '', lonM: '', lonH: 'O' }

/** Grados y minutos a decimal. NaN si falta algo o se sale de rango. */
export function fieldsToDecimal(f: CoordFields): { lat: number; lon: number } {
  const parte = (g: string, m: string, negativo: boolean, maxG: number) => {
    if (!g.trim()) return NaN
    const grados = Number(g.replace(',', '.'))
    const minutos = m.trim() ? Number(m.replace(',', '.')) : 0
    if (!Number.isFinite(grados) || !Number.isFinite(minutos)) return NaN
    if (grados < 0 || grados > maxG || minutos < 0 || minutos >= 60) return NaN
    const v = grados + minutos / 60
    if (v > maxG) return NaN
    return negativo ? -v : v
  }
  return {
    lat: parte(f.latG, f.latM, f.latH === 'S', 90),
    lon: parte(f.lonG, f.lonM, f.lonH === 'O', 180),
  }
}

/** Reparte unas coordenadas pegadas de cualquier forma entre los campos. */
export function spreadPasted(texto: string): CoordFields | null {
  // Se parte por el hemisferio de la latitud o por un separador claro.
  const limpio = texto.trim()
  const m = limpio.match(/^(.*?[NS])\s*[,;/]?\s*(.*[EWO].*)$/i)
    ?? limpio.match(/^([^,;]+)[,;]\s*(.+)$/)
  if (!m) return null
  const lat = parseCoord(m[1])
  const lon = parseCoord(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null

  const trocear = (v: number) => {
    const abs = Math.abs(v)
    const g = Math.floor(abs)
    return { g: String(g), m: ((abs - g) * 60).toFixed(3).replace('.', ',') }
  }
  const a = trocear(lat)
  const b = trocear(lon)
  return {
    latG: a.g, latM: a.m, latH: lat >= 0 ? 'N' : 'S',
    lonG: b.g, lonM: b.m, lonH: lon >= 0 ? 'E' : 'O',
  }
}

export default function CoordinateEntry({ onGo }: { onGo: (lat: number, lon: number) => void }) {
  const [f, setF] = useState<CoordFields>(VACIO)
  const [error, setError] = useState<string | null>(null)

  const { lat, lon } = fieldsToDecimal(f)
  const valido = Number.isFinite(lat) && Number.isFinite(lon)
  const vista = valido ? formatNautical(lat, lon) : null

  const set = (k: keyof CoordFields) => (v: string) => {
    setError(null)
    setF((prev) => ({ ...prev, [k]: v }))
  }

  const alPegar = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const texto = e.clipboardData.getData('text')
    // Solo se reparte si trae las dos coordenadas; si no, se deja pegar normal.
    if (!/[NSEWO]/i.test(texto) && !/[,;]/.test(texto)) return
    const repartido = spreadPasted(texto)
    if (!repartido) return
    e.preventDefault()
    setError(null)
    setF(repartido)
  }

  const ir = () => {
    if (!valido) {
      setError('Revisa las coordenadas: los minutos van de 0 a 59,999 y la latitud no pasa de 90°.')
      return
    }
    onGo(lat, lon)
  }

  const campo = 'border border-ink/12 rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:border-accent min-w-0'

  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); ir() }}>
      {(['lat', 'lon'] as const).map((eje) => (
        <div key={eje} className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/60 w-8 shrink-0">
            {eje === 'lat' ? 'Lat' : 'Lon'}
          </span>
          <input
            inputMode="numeric" aria-label={eje === 'lat' ? 'Grados de latitud' : 'Grados de longitud'}
            placeholder={eje === 'lat' ? '36' : '005'}
            value={eje === 'lat' ? f.latG : f.lonG}
            onChange={(e) => set(eje === 'lat' ? 'latG' : 'lonG')(e.target.value)}
            onPaste={alPegar}
            className={`${campo} w-14`} />
          <span className="text-[13px] text-ink/50">°</span>
          <input
            inputMode="decimal" aria-label={eje === 'lat' ? 'Minutos de latitud' : 'Minutos de longitud'}
            placeholder="00,000"
            value={eje === 'lat' ? f.latM : f.lonM}
            onChange={(e) => set(eje === 'lat' ? 'latM' : 'lonM')(e.target.value)}
            onPaste={alPegar}
            className={`${campo} flex-1`} />
          <span className="text-[13px] text-ink/50">&apos;</span>
          <select
            aria-label={eje === 'lat' ? 'Hemisferio de latitud' : 'Hemisferio de longitud'}
            value={eje === 'lat' ? f.latH : f.lonH}
            onChange={(e) => set(eje === 'lat' ? 'latH' : 'lonH')(e.target.value)}
            className={`${campo} w-14`}>
            {(eje === 'lat' ? ['N', 'S'] : ['E', 'O']).map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      ))}

      {/* Se enseña lo que se ha entendido antes de mover nada: si el usuario ha
          escrito los minutos donde van los grados, aquí se ve al momento. */}
      {vista && (
        <p className="text-[11.5px] text-ink/60">
          {vista.lat} · {vista.lon}
          <span className="text-ink/40"> ({lat.toFixed(5)}, {lon.toFixed(5)})</span>
        </p>
      )}
      {error && <p className="text-[12px] text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={!valido}
          className="bg-accent text-paper px-4 py-2 text-[13px] font-semibold rounded-full disabled:opacity-50">
          Marcar en la carta
        </button>
        {(f.latG || f.lonG) && (
          <button type="button" onClick={() => { setF(VACIO); setError(null) }}
            className="px-3 py-2 text-[13px] text-ink/60 hover:text-ink">Limpiar</button>
        )}
      </div>
      <p className="text-[11px] text-ink/50">
        También puedes pegar unas coordenadas enteras en cualquier casilla.
      </p>
    </form>
  )
}
