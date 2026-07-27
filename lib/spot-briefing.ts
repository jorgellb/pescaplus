import { unstable_cache } from 'next/cache'
import { generatePlanAdvice } from '@/lib/nvidia-ai'

/**
 * "El resumen del asesor" on the zone dashboard: a 2-3 sentence daily briefing
 * that reads the day's own computed facts back in plain language. Reuses the
 * exact same generator (and its "use only these facts, never invent numbers"
 * prompt) that already powers the /plan page — this just surfaces it directly
 * on the main dashboard, one click earlier.
 *
 * Cached per (spot, day, modality, species): a fresh call to the model for
 * every single page view would be slow and needless — conditions worth
 * re-summarizing don't change minute to minute. Six hours matches how often a
 * fishing day's character actually shifts (morning vs. evening tide/light).
 */
export const BRIEFING_REVALIDATE_S = 21600

async function computeBriefing(
  spotSlug: string,
  dateISO: string,
  modalityId: string,
  speciesId: string,
  spotName: string,
  dateLong: string,
  modalityName: string,
  speciesName: string,
  facts: string[],
): Promise<string> {
  return generatePlanAdvice({ spotName, dateLong, modality: modalityName, speciesName, facts })
}

export const getCachedBriefing = unstable_cache(
  computeBriefing,
  ['spot-briefing-v1'],
  { revalidate: BRIEFING_REVALIDATE_S, tags: ['spot-briefing'] },
)
