import type { FishingSpot } from '@/lib/fishing-spots'

/**
 * Map each coastal spot to its AEMET coast bulletin (40-47) and the keyword of
 * its "aguas costeras" subzone (province/island), derived from region + lon/lat
 * (province boundaries approximated at the coast).
 */
export function aemetZoneFor(s: FishingSpot): { costa: number; keyword: string } | null {
  if (s.type !== 'mar') return null
  const { region, lat, lon } = s

  if (region === 'Galicia') {
    if (lon > -7.7) return { costa: 40, keyword: 'Lugo' }
    if (lat >= 42.72) return { costa: 40, keyword: 'Coruña' }
    return { costa: 40, keyword: 'Pontevedra' }
  }
  if (region === 'Asturias') return { costa: 41, keyword: 'Asturias' }
  if (region === 'Cantabria') return { costa: 41, keyword: 'Cantabria' }
  if (region === 'País Vasco') return { costa: 41, keyword: lon < -2.4 ? 'Bizkaia' : 'Gipuzkoa' }
  if (region === 'Andalucía') {
    if (lon < -6.5) return { costa: 42, keyword: 'Huelva' }
    if (lon < -5.15) return { costa: 42, keyword: 'Cádiz' }
    if (lon < -3.79) return { costa: 47, keyword: 'Málaga' }
    if (lon < -3.2) return { costa: 47, keyword: 'Granada' }
    return { costa: 47, keyword: 'Almería' }
  }
  if (region === 'Ceuta') return { costa: 42, keyword: 'Cádiz' }
  if (region === 'Melilla') return { costa: 47, keyword: 'Melilla' }
  if (region === 'Murcia') {
    const marMenor = ['la-manga', 'los-alcazares', 'san-pedro-pinatar'].includes(s.slug)
    return { costa: 46, keyword: marMenor ? 'Mar Menor' : 'Murcia' }
  }
  if (region === 'Comunidad Valenciana') {
    if (lat >= 39.75) return { costa: 46, keyword: 'Castellón' }
    if (lat >= 38.9) return { costa: 46, keyword: 'Valencia' }
    return { costa: 46, keyword: 'Alicante' }
  }
  if (region === 'Cataluña') {
    if (lat >= 41.63) return { costa: 45, keyword: 'Girona' }
    if (lat >= 41.2) return { costa: 45, keyword: 'Barcelona' }
    return { costa: 45, keyword: 'Tarragona' }
  }
  if (region === 'Baleares') {
    // AEMET splits the big islands by shore; match each port to its side.
    if (s.slug === 'ciutadella') return { costa: 44, keyword: 'Norte de Menorca' }
    if (s.slug === 'mao') return { costa: 44, keyword: 'Sur de Menorca' }
    if (['eivissa', 'sant-antoni', 'santa-eularia'].includes(s.slug)) return { costa: 44, keyword: 'Ibiza' }
    if (s.slug === 'formentera') return { costa: 44, keyword: 'Formentera' }
    if (['palma', 'andratx'].includes(s.slug)) return { costa: 44, keyword: 'Sur de Mallorca' }
    if (s.slug === 'soller') return { costa: 44, keyword: 'Noroeste de Mallorca' }
    if (['pollensa', 'alcudia'].includes(s.slug)) return { costa: 44, keyword: 'Nordeste de Mallorca' }
    return { costa: 44, keyword: 'Este de Mallorca' } // cala-ratjada, portocolom
  }
  if (region === 'Canarias') {
    if (s.slug === 'santa-cruz-la-palma') return { costa: 43, keyword: 'La Palma' }
    if (s.slug === 'valverde-hierro') return { costa: 43, keyword: 'Hierro' }
    if (s.slug === 'san-sebastian-gomera') return { costa: 43, keyword: 'Gomera' }
    if (['arrecife', 'playa-blanca'].includes(s.slug)) return { costa: 43, keyword: 'Lanzarote' }
    if (['corralejo', 'puerto-del-rosario', 'morro-jable'].includes(s.slug)) return { costa: 43, keyword: 'Fuerteventura' }
    if (['las-palmas', 'puerto-mogan', 'maspalomas'].includes(s.slug)) return { costa: 43, keyword: 'Gran Canaria' }
    return { costa: 43, keyword: 'Tenerife' }
  }
  return null
}
