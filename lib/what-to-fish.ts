import { SEA_SPECIES, type SpeciesProfile } from '@/lib/fishing-species'

/**
 * "Qué buscar hoy": rank the sea species for a spot right now using season,
 * measured sea temperature, today's sea state and the solunar rating. Every
 * point of the score maps to a human-readable reason — no black boxes.
 */
export interface SpeciesPick {
  species: SpeciesProfile
  score: number
  reasons: string[]
}

export function rankSpeciesToday(input: {
  month: number // 1..12
  seaTempC: number | null
  waveM: number | null
  solunarRating: number // 1..5
}): SpeciesPick[] {
  const { month, seaTempC, waveM, solunarRating } = input
  const prev = ((month + 10) % 12) + 1
  const next = (month % 12) + 1

  const picks = SEA_SPECIES.map((sp) => {
    let score = 0
    const reasons: string[] = []

    if (sp.bestMonths.includes(month)) {
      score += 40
      reasons.push('temporada alta')
    } else if (sp.bestMonths.includes(prev) || sp.bestMonths.includes(next)) {
      score += 15
      reasons.push('inicio/fin de temporada')
    }

    if (seaTempC != null) {
      const [lo, hi] = sp.seaTempC
      if (seaTempC >= lo && seaTempC <= hi) {
        score += 22
        reasons.push(`agua a ${Math.round(seaTempC)}°C, en su rango`)
      } else if (seaTempC >= lo - 2 && seaTempC <= hi + 2) {
        score += 8
      } else {
        score -= 10
      }
    }

    if (waveM != null) {
      if (sp.wavePref === 'rough' && waveM >= 0.75) {
        score += 16
        reasons.push('mar movida que la activa')
      } else if (sp.wavePref === 'calm' && waveM < 0.75) {
        score += 16
        reasons.push('mar en calma, como le gusta')
      } else if (sp.wavePref === 'moderate' && waveM >= 0.3 && waveM <= 1.5) {
        score += 12
        reasons.push('mar adecuada')
      } else if ((sp.wavePref === 'calm' && waveM > 1.5) || (sp.wavePref === 'rough' && waveM < 0.3)) {
        score -= 8
      }
    }

    if (solunarRating >= 4) {
      score += 6
      reasons.push('buen día solunar')
    }

    return { species: sp, score, reasons }
  })

  return picks.sort((a, b) => b.score - a.score)
}
