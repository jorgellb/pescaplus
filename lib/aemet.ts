/**
 * Official coastal maritime bulletins from AEMET OpenData (the Spanish state
 * meteorology agency): the legally authoritative "estado de la mar" and the
 * official coastal warnings. Two-step API (envelope → datos URL), responses
 * sometimes in latin-1. Requires AEMET_API_KEY; without it the module hides.
 * Cached hard (bulletins are elaborated twice a day). Never throws.
 *
 * © AEMET — use authorised citing AEMET as author (we credit on every render).
 */
export interface AemetBulletin {
  configured: boolean
  available: boolean
  /** Official warning text ("No hay avisos." when clear). */
  avisoTexto: string
  hasAviso: boolean
  situacion: string
  /** The forecast text for the spot's own coastal waters. */
  subzonaNombre: string
  subzonaTexto: string
  elaborado: string | null
}

const EMPTY = (configured: boolean): AemetBulletin => ({
  configured,
  available: false,
  avisoTexto: '',
  hasAviso: false,
  situacion: '',
  subzonaNombre: '',
  subzonaTexto: '',
  elaborado: null,
})

export const AEMET_REVALIDATE_S = 3600

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { next: { revalidate: AEMET_REVALIDATE_S }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    for (const enc of ['utf-8', 'latin1'] as const) {
      try {
        return JSON.parse(new TextDecoder(enc, { fatal: enc === 'utf-8' }).decode(buf))
      } catch {
        /* try next encoding */
      }
    }
    return null
  } catch {
    return null
  }
}

interface RawZona {
  nombre?: string
  subzona?: { nombre?: string; texto?: string }[]
  texto?: string
}

/**
 * Fetch the bulletin for an AEMET coast (40–47) and extract the subzone whose
 * name contains `subzonaKeyword` (case/accent-insensitive).
 */
export async function getAemetBulletin(costa: number, subzonaKeyword: string): Promise<AemetBulletin> {
  const key = process.env.AEMET_API_KEY
  if (!key) return EMPTY(false)

  const envelope = (await fetchJson(
    `https://opendata.aemet.es/opendata/api/prediccion/maritima/costera/costa/${costa}?api_key=${key}`,
  )) as { estado?: number; datos?: string } | null
  if (!envelope || envelope.estado !== 200 || !envelope.datos) return EMPTY(true)

  const data = await fetchJson(envelope.datos)
  const b = (Array.isArray(data) ? data[0] : data) as {
    origen?: { elaborado?: string }
    aviso?: { texto?: string }
    situacion?: { texto?: string }
    prediccion?: { zona?: RawZona[] }
  } | null
  if (!b?.prediccion?.zona) return EMPTY(true)

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const kw = norm(subzonaKeyword)
  let subNombre = ''
  let subTexto = ''
  outer: for (const z of b.prediccion.zona) {
    for (const sz of z.subzona ?? []) {
      if (norm(sz.nombre ?? '').includes(kw) && sz.texto) {
        subNombre = sz.nombre ?? ''
        subTexto = sz.texto
        break outer
      }
    }
    if (norm(z.nombre ?? '').includes(kw)) {
      const first = z.subzona?.[0]
      if (first?.texto) {
        subNombre = z.nombre ?? ''
        subTexto = first.texto
        break
      }
    }
  }
  // Fallback: first subzone of the coast, better than nothing but still official.
  if (!subTexto) {
    const first = b.prediccion.zona[0]?.subzona?.[0]
    subNombre = b.prediccion.zona[0]?.nombre ?? ''
    subTexto = first?.texto ?? ''
  }

  const avisoTexto = (b.aviso?.texto ?? '').trim()
  return {
    configured: true,
    available: subTexto.length > 0,
    avisoTexto,
    hasAviso: avisoTexto.length > 0 && !/no hay avisos/i.test(avisoTexto),
    situacion: (b.situacion?.texto ?? '').trim(),
    subzonaNombre: subNombre,
    subzonaTexto: subTexto,
    elaborado: b.origen?.elaborado ?? null,
  }
}
