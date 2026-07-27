'use client'

import { useRef, useState } from 'react'
import { parseMarks, COMPATIBILIDAD, NO_SOPORTADOS } from '@/lib/marks-io'
import type { WaypointInput } from '@/lib/waypoint-types'

/**
 * Traer y llevar marcas entre PescaPlus y la sonda o el GPS de a bordo.
 *
 * El fichero se LEE EN EL NAVEGADOR antes de mandar nada. Así se puede decir
 * cuántas marcas trae y qué se ha descartado ANTES de tocar la cuenta de nadie:
 * subir un fichero a ciegas y ver aparecer trescientas marcas —o ninguna— sin
 * explicación es exactamente lo que hace desconfiar de una herramienta.
 */
export default function MarksTransfer({ onImported }: { onImported?: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [previo, setPrevio] = useState<{ marcas: WaypointInput[]; formato: string | null; avisos: string[]; archivo: string } | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const leerArchivo = async (file: File) => {
    setError(null); setResultado(null); setPrevio(null)
    if (file.size > 8_000_000) { setError('El archivo es demasiado grande (máximo 8 MB).'); return }
    // Los aparatos viejos escriben en latin-1: si aparece el carácter de
    // reemplazo, se vuelve a decodificar antes que enseñar nombres rotos.
    const buf = await file.arrayBuffer()
    let texto = new TextDecoder('utf-8').decode(buf)
    if (texto.includes('�')) texto = new TextDecoder('windows-1252').decode(buf)

    const r = parseMarks(texto, file.name)
    if (r.waypoints.length === 0) {
      setError(r.warnings[0] ?? 'No se han encontrado marcas en el archivo.')
      return
    }
    setPrevio({ marcas: r.waypoints, formato: r.format, avisos: r.warnings, archivo: file.name })
  }

  const confirmar = async () => {
    if (!previo) return
    setSubiendo(true); setError(null)
    try {
      const r = await fetch('/api/waypoints/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints: previo.marcas }),
      })
      const d = await r.json()
      if (d.success) {
        setResultado(`${d.imported} marcas importadas. Son privadas: solo las ves tú.`)
        setPrevio(null)
        onImported?.()
      } else {
        setError(d.error ?? 'No se han podido importar las marcas.')
      }
    } catch {
      setError('No se han podido importar las marcas. Inténtalo otra vez.')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[13px] font-semibold text-ink">Traer marcas de tu sonda o GPS</p>
        <p className="text-[12px] text-ink/60 mt-0.5">
          Exporta desde el aparato en GPX y suéltalo aquí. También se aceptan CSV y KML.
        </p>
      </div>

      <input ref={input} type="file" accept=".gpx,.csv,.kml,.txt,.tsv,application/gpx+xml,text/csv,text/plain" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void leerArchivo(f); e.target.value = '' }} />
      <button type="button" onClick={() => input.current?.click()}
        className="w-full border border-dashed border-ink/25 rounded-xl px-4 py-3 text-[13px] text-ink/70 hover:border-accent hover:text-ink transition-colors">
        Elegir archivo…
      </button>

      {error && <p className="text-[12.5px] text-red-700">{error}</p>}
      {resultado && <p className="text-[12.5px] text-accent font-semibold">{resultado}</p>}

      {/* Se enseña lo que se ha encontrado ANTES de escribir nada en la cuenta. */}
      {previo && (
        <div className="rounded-xl border border-ink/[0.12] bg-ink/[0.03] p-3 space-y-2">
          <p className="text-[13px] text-ink">
            <strong>{previo.marcas.length} marcas</strong> en {previo.archivo}
            {previo.formato && <span className="text-ink/60"> · {previo.formato.toUpperCase()}</span>}
          </p>
          <ul className="text-[12px] text-ink/70 space-y-0.5 max-h-28 overflow-y-auto">
            {previo.marcas.slice(0, 5).map((w, i) => (
              <li key={i} className="truncate">
                {w.name} · {w.lat.toFixed(4)}, {w.lon.toFixed(4)}
                {w.depthM != null && ` · ${w.depthM} m`}
              </li>
            ))}
            {previo.marcas.length > 5 && <li className="text-ink/50">y {previo.marcas.length - 5} más…</li>}
          </ul>
          {previo.avisos.map((a) => <p key={a} className="text-[12px] text-amber-900">{a}</p>)}
          <div className="flex gap-2">
            <button type="button" onClick={confirmar} disabled={subiendo}
              className="bg-accent text-paper px-4 py-2 text-[13px] font-semibold rounded-full disabled:opacity-60">
              {subiendo ? 'Importando…' : `Importar ${previo.marcas.length}`}
            </button>
            <button type="button" onClick={() => setPrevio(null)}
              className="px-3 py-2 text-[13px] text-ink/60 hover:text-ink">Cancelar</button>
          </div>
        </div>
      )}

      <div className="pt-1">
        <p className="text-[13px] font-semibold text-ink">Llevar tus marcas al aparato</p>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {[['gpx', 'GPX'], ['csv', 'CSV'], ['kml', 'KML']].map(([f, etiqueta]) => (
            <a key={f} href={`/api/waypoints/exportar?formato=${f}`} download
              className="px-3 py-1.5 rounded-full text-[13px] font-semibold border border-ink/12 hover:border-accent text-ink">
              {etiqueta}
            </a>
          ))}
        </div>
      </div>

      <details className="text-[12px] text-ink/70">
        <summary className="cursor-pointer font-semibold text-ink/80">¿Qué formato usa mi aparato?</summary>
        <div className="mt-2 space-y-2">
          {COMPATIBILIDAD.map((c) => (
            <p key={c.formato}>
              <strong className="text-ink">{c.formato}</strong> — {c.aparatos}
              {c.nota && <span className="text-ink/60"> ({c.nota})</span>}
            </p>
          ))}
          {/* Decir lo que NO se puede leer evita que alguien suba un .usr y se
              quede sin entender por qué no pasa nada. */}
          <p className="pt-1">
            <strong className="text-ink">No se leen</strong> los archivos propios de cada marca
            ({NO_SOPORTADOS.map((n) => n.ext).join(', ')}): son formatos cerrados y leerlos a ciegas
            podría colocarte una marca donde no es. Todos esos aparatos exportan en GPX — busca
            &ldquo;export GPX&rdquo; en su menú de waypoints.
          </p>
        </div>
      </details>
    </div>
  )
}
