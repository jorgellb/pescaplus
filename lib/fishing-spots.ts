/** Curated Spanish fishing spots for the "best fishing hours" tool. */
export interface FishingSpot {
  slug: string
  name: string
  region: string
  type: 'mar' | 'interior'
  lat: number
  lon: number
  /** What it's known for — used in copy. */
  known: string
}

export const FISHING_SPOTS: FishingSpot[] = [
  // Coast
  { slug: 'cadiz', name: 'Cádiz', region: 'Andalucía', type: 'mar', lat: 36.53, lon: -6.29, known: 'lubina, dorada y sargo desde playa y roca' },
  { slug: 'huelva', name: 'Huelva', region: 'Andalucía', type: 'mar', lat: 37.26, lon: -6.95, known: 'corvina y lubina en estuario y playa' },
  { slug: 'malaga', name: 'Málaga', region: 'Andalucía', type: 'mar', lat: 36.72, lon: -4.42, known: 'pesca de playa y embarcación en el Mediterráneo' },
  { slug: 'almeria', name: 'Almería', region: 'Andalucía', type: 'mar', lat: 36.84, lon: -2.46, known: 'sargo, dorada y dentón' },
  { slug: 'cartagena', name: 'Cartagena', region: 'Murcia', type: 'mar', lat: 37.6, lon: -0.98, known: 'spinning costero y pesca de roca' },
  { slug: 'alicante', name: 'Alicante', region: 'Comunidad Valenciana', type: 'mar', lat: 38.35, lon: -0.48, known: 'lubina y sargo en el litoral' },
  { slug: 'valencia', name: 'Valencia', region: 'Comunidad Valenciana', type: 'mar', lat: 39.47, lon: -0.33, known: 'pesca de playa y puerto' },
  { slug: 'tarragona', name: 'Tarragona', region: 'Cataluña', type: 'mar', lat: 41.12, lon: 1.25, known: 'roca y embarcación' },
  { slug: 'barcelona', name: 'Barcelona', region: 'Cataluña', type: 'mar', lat: 41.35, lon: 2.17, known: 'espigones y pesca de playa' },
  { slug: 'palma', name: 'Palma de Mallorca', region: 'Baleares', type: 'mar', lat: 39.57, lon: 2.65, known: 'roquero, cala y embarcación' },
  { slug: 'santander', name: 'Santander', region: 'Cantabria', type: 'mar', lat: 43.46, lon: -3.81, known: 'lubina a spinning en el Cantábrico' },
  { slug: 'donostia', name: 'San Sebastián', region: 'País Vasco', type: 'mar', lat: 43.32, lon: -1.98, known: 'lubina y verderol' },
  { slug: 'gijon', name: 'Gijón', region: 'Asturias', type: 'mar', lat: 43.54, lon: -5.66, known: 'pesca de roca del Cantábrico' },
  { slug: 'a-coruna', name: 'A Coruña', region: 'Galicia', type: 'mar', lat: 43.37, lon: -8.4, known: 'lubina, maragota y pesca de roca' },
  { slug: 'vigo', name: 'Vigo', region: 'Galicia', type: 'mar', lat: 42.24, lon: -8.72, known: 'rías, robaliza y sargo' },
  { slug: 'las-palmas', name: 'Las Palmas', region: 'Canarias', type: 'mar', lat: 28.13, lon: -15.44, known: 'pesca de roca y embarcación atlántica' },
  // Inland reservoirs / rivers
  { slug: 'mequinenza', name: 'Embalse de Mequinenza', region: 'Aragón', type: 'interior', lat: 41.37, lon: 0.3, known: 'siluro, lucioperca y black bass' },
  { slug: 'ebro-caspe', name: 'Ebro (Caspe)', region: 'Aragón', type: 'interior', lat: 41.23, lon: -0.03, known: 'siluro y carpa de gran tamaño' },
  { slug: 'orellana', name: 'Embalse de Orellana', region: 'Extremadura', type: 'interior', lat: 39.02, lon: -5.53, known: 'black bass y lucio' },
  { slug: 'garcia-sola', name: 'Embalse de García Sola', region: 'Extremadura', type: 'interior', lat: 39.23, lon: -5.03, known: 'black bass y carpa' },
  { slug: 'valdecanas', name: 'Embalse de Valdecañas', region: 'Extremadura', type: 'interior', lat: 39.77, lon: -5.44, known: 'black bass y lucio' },
  { slug: 'entrepenas', name: 'Embalse de Entrepeñas', region: 'Castilla-La Mancha', type: 'interior', lat: 40.5, lon: -2.66, known: 'lucio, black bass y perca' },
  { slug: 'ricobayo', name: 'Embalse de Ricobayo', region: 'Castilla y León', type: 'interior', lat: 41.55, lon: -5.87, known: 'lucioperca y black bass' },
  { slug: 'aranjuez', name: 'Río Tajo (Aranjuez)', region: 'Madrid', type: 'interior', lat: 40.03, lon: -3.6, known: 'black bass, carpa y barbo' },
]

export function getSpot(slug: string): FishingSpot | undefined {
  return FISHING_SPOTS.find((s) => s.slug === slug)
}
