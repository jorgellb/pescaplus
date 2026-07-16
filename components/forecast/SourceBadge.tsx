import { fmtTime } from '@/lib/solunar-format'

/**
 * Trust metadata line for a forecast module: source, data kind, when it was
 * refreshed, when the next refresh comes, and how far the model point sits.
 */
export default function SourceBadge({
  source,
  kind,
  fetchedAt,
  revalidateS,
  distanceKm,
  extra,
}: {
  source: string
  kind: 'previsto' | 'calculado' | 'predicción armónica'
  fetchedAt?: number | null
  revalidateS?: number
  distanceKm?: number | null
  extra?: string
}) {
  const bits: string[] = [`Fuente: ${source} (${kind})`]
  if (distanceKm != null && distanceKm > 0) bits.push(`punto del modelo a ${distanceKm} km`)
  if (fetchedAt) {
    bits.push(`actualizado ${fmtTime(fetchedAt)}`)
    if (revalidateS) bits.push(`próxima ~${fmtTime(fetchedAt + revalidateS * 1000)}`)
  }
  if (extra) bits.push(extra)
  return <p className="font-mono text-[10px] uppercase tracking-wide text-ink/35 leading-relaxed">{bits.join(' · ')}</p>
}
