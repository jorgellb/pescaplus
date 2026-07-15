/** Fishing spots across Spain for the "best fishing hours" tool. */
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

const RIAS_BAIXAS = 'robaliza, sargo y maragota en las Rías Baixas'
const RIAS_ALTAS = 'lubina y pesca de roca en las Rías Altas'
const CANTABRICO = 'lubina a spinning y roqueo del Cantábrico'
const COSTA_MORTE = 'roqueo atlántico en la Costa da Morte'
const MEDITERRANEO = 'lubina, dorada y sargo en el Mediterráneo'
const COSTA_TROPICAL = 'dentón, sargo y dorada en la Costa Tropical'
const ATLANTICO_SUR = 'lubina, corvina y dorada en el Atlántico'
const CANARIO = 'roquero y pesca de embarcación atlántica'

export const FISHING_SPOTS: FishingSpot[] = [
  // ── Galicia ──────────────────────────────────────────────────────────────
  { slug: 'a-coruna', name: 'A Coruña', region: 'Galicia', type: 'mar', lat: 43.37, lon: -8.4, known: 'lubina, maragota y pesca de roca' },
  { slug: 'ferrol', name: 'Ferrol', region: 'Galicia', type: 'mar', lat: 43.48, lon: -8.24, known: RIAS_ALTAS },
  { slug: 'ribadeo', name: 'Ribadeo', region: 'Galicia', type: 'mar', lat: 43.54, lon: -7.04, known: RIAS_ALTAS },
  { slug: 'viveiro', name: 'Viveiro', region: 'Galicia', type: 'mar', lat: 43.66, lon: -7.59, known: RIAS_ALTAS },
  { slug: 'burela', name: 'Burela', region: 'Galicia', type: 'mar', lat: 43.65, lon: -7.36, known: 'puerto de altura del Cantábrico gallego' },
  { slug: 'carino', name: 'Cariño', region: 'Galicia', type: 'mar', lat: 43.74, lon: -7.87, known: RIAS_ALTAS },
  { slug: 'malpica', name: 'Malpica', region: 'Galicia', type: 'mar', lat: 43.32, lon: -8.81, known: COSTA_MORTE },
  { slug: 'camarinas', name: 'Camariñas', region: 'Galicia', type: 'mar', lat: 43.13, lon: -9.18, known: COSTA_MORTE },
  { slug: 'muxia', name: 'Muxía', region: 'Galicia', type: 'mar', lat: 43.1, lon: -9.22, known: COSTA_MORTE },
  { slug: 'fisterra', name: 'Fisterra', region: 'Galicia', type: 'mar', lat: 42.9, lon: -9.26, known: COSTA_MORTE },
  { slug: 'corcubion', name: 'Corcubión', region: 'Galicia', type: 'mar', lat: 42.94, lon: -9.19, known: COSTA_MORTE },
  { slug: 'muros', name: 'Muros', region: 'Galicia', type: 'mar', lat: 42.78, lon: -9.06, known: RIAS_BAIXAS },
  { slug: 'noia', name: 'Noia', region: 'Galicia', type: 'mar', lat: 42.79, lon: -8.89, known: RIAS_BAIXAS },
  { slug: 'ribeira', name: 'Ribeira', region: 'Galicia', type: 'mar', lat: 42.56, lon: -8.99, known: RIAS_BAIXAS },
  { slug: 'vilagarcia', name: 'Vilagarcía de Arousa', region: 'Galicia', type: 'mar', lat: 42.6, lon: -8.76, known: RIAS_BAIXAS },
  { slug: 'o-grove', name: 'O Grove', region: 'Galicia', type: 'mar', lat: 42.49, lon: -8.86, known: RIAS_BAIXAS },
  { slug: 'sanxenxo', name: 'Sanxenxo', region: 'Galicia', type: 'mar', lat: 42.4, lon: -8.81, known: RIAS_BAIXAS },
  { slug: 'marin', name: 'Marín', region: 'Galicia', type: 'mar', lat: 42.39, lon: -8.7, known: RIAS_BAIXAS },
  { slug: 'cangas', name: 'Cangas', region: 'Galicia', type: 'mar', lat: 42.26, lon: -8.78, known: RIAS_BAIXAS },
  { slug: 'vigo', name: 'Vigo', region: 'Galicia', type: 'mar', lat: 42.24, lon: -8.72, known: 'rías, robaliza y sargo' },
  { slug: 'baiona', name: 'Baiona', region: 'Galicia', type: 'mar', lat: 42.12, lon: -8.85, known: RIAS_BAIXAS },
  { slug: 'a-guarda', name: 'A Guarda', region: 'Galicia', type: 'mar', lat: 41.9, lon: -8.87, known: 'desembocadura del Miño, lubina y sargo' },

  // ── Asturias ─────────────────────────────────────────────────────────────
  { slug: 'gijon', name: 'Gijón', region: 'Asturias', type: 'mar', lat: 43.54, lon: -5.66, known: CANTABRICO },
  { slug: 'aviles', name: 'Avilés', region: 'Asturias', type: 'mar', lat: 43.56, lon: -5.92, known: CANTABRICO },
  { slug: 'candas', name: 'Candás', region: 'Asturias', type: 'mar', lat: 43.59, lon: -5.76, known: CANTABRICO },
  { slug: 'luanco', name: 'Luanco', region: 'Asturias', type: 'mar', lat: 43.61, lon: -5.79, known: CANTABRICO },
  { slug: 'cudillero', name: 'Cudillero', region: 'Asturias', type: 'mar', lat: 43.56, lon: -6.14, known: CANTABRICO },
  { slug: 'luarca', name: 'Luarca', region: 'Asturias', type: 'mar', lat: 43.54, lon: -6.54, known: CANTABRICO },
  { slug: 'navia', name: 'Navia', region: 'Asturias', type: 'mar', lat: 43.54, lon: -6.72, known: CANTABRICO },
  { slug: 'tapia', name: 'Tapia de Casariego', region: 'Asturias', type: 'mar', lat: 43.57, lon: -6.94, known: CANTABRICO },
  { slug: 'lastres', name: 'Lastres', region: 'Asturias', type: 'mar', lat: 43.51, lon: -5.27, known: CANTABRICO },
  { slug: 'ribadesella', name: 'Ribadesella', region: 'Asturias', type: 'mar', lat: 43.46, lon: -5.06, known: 'playa y roca del oriente asturiano' },
  { slug: 'llanes', name: 'Llanes', region: 'Asturias', type: 'mar', lat: 43.42, lon: -4.75, known: 'roca y playa del oriente asturiano' },

  // ── Cantabria ────────────────────────────────────────────────────────────
  { slug: 'santander', name: 'Santander', region: 'Cantabria', type: 'mar', lat: 43.46, lon: -3.81, known: CANTABRICO },
  { slug: 'san-vicente-barquera', name: 'San Vicente de la Barquera', region: 'Cantabria', type: 'mar', lat: 43.39, lon: -4.4, known: CANTABRICO },
  { slug: 'comillas', name: 'Comillas', region: 'Cantabria', type: 'mar', lat: 43.39, lon: -4.29, known: CANTABRICO },
  { slug: 'suances', name: 'Suances', region: 'Cantabria', type: 'mar', lat: 43.43, lon: -4.04, known: CANTABRICO },
  { slug: 'santona', name: 'Santoña', region: 'Cantabria', type: 'mar', lat: 43.44, lon: -3.46, known: 'puerto de altura, bocarte y lubina' },
  { slug: 'noja', name: 'Noja', region: 'Cantabria', type: 'mar', lat: 43.49, lon: -3.53, known: CANTABRICO },
  { slug: 'laredo', name: 'Laredo', region: 'Cantabria', type: 'mar', lat: 43.41, lon: -3.41, known: 'playa y bocana, lubina a spinning' },
  { slug: 'castro-urdiales', name: 'Castro-Urdiales', region: 'Cantabria', type: 'mar', lat: 43.38, lon: -3.22, known: CANTABRICO },

  // ── País Vasco ───────────────────────────────────────────────────────────
  { slug: 'bilbao', name: 'Bilbao', region: 'País Vasco', type: 'mar', lat: 43.34, lon: -3.01, known: CANTABRICO },
  { slug: 'getxo', name: 'Getxo', region: 'País Vasco', type: 'mar', lat: 43.35, lon: -3.01, known: CANTABRICO },
  { slug: 'bermeo', name: 'Bermeo', region: 'País Vasco', type: 'mar', lat: 43.42, lon: -2.72, known: 'puerto de altura y roqueo' },
  { slug: 'mutriku', name: 'Mutriku', region: 'País Vasco', type: 'mar', lat: 43.31, lon: -2.38, known: CANTABRICO },
  { slug: 'ondarroa', name: 'Ondarroa', region: 'País Vasco', type: 'mar', lat: 43.32, lon: -2.42, known: CANTABRICO },
  { slug: 'lekeitio', name: 'Lekeitio', region: 'País Vasco', type: 'mar', lat: 43.36, lon: -2.5, known: CANTABRICO },
  { slug: 'zumaia', name: 'Zumaia', region: 'País Vasco', type: 'mar', lat: 43.3, lon: -2.25, known: CANTABRICO },
  { slug: 'getaria', name: 'Getaria', region: 'País Vasco', type: 'mar', lat: 43.3, lon: -2.2, known: CANTABRICO },
  { slug: 'zarautz', name: 'Zarautz', region: 'País Vasco', type: 'mar', lat: 43.28, lon: -2.17, known: 'lubina a spinning en playa' },
  { slug: 'donostia', name: 'San Sebastián', region: 'País Vasco', type: 'mar', lat: 43.32, lon: -1.98, known: 'lubina y verderol' },
  { slug: 'pasaia', name: 'Pasaia', region: 'País Vasco', type: 'mar', lat: 43.32, lon: -1.92, known: CANTABRICO },
  { slug: 'hondarribia', name: 'Hondarribia', region: 'País Vasco', type: 'mar', lat: 43.36, lon: -1.79, known: 'desembocadura del Bidasoa' },

  // ── Huelva ───────────────────────────────────────────────────────────────
  { slug: 'ayamonte', name: 'Ayamonte', region: 'Andalucía', type: 'mar', lat: 37.21, lon: -7.4, known: 'desembocadura del Guadiana' },
  { slug: 'isla-cristina', name: 'Isla Cristina', region: 'Andalucía', type: 'mar', lat: 37.2, lon: -7.32, known: 'estuario y playa, corvina y lubina' },
  { slug: 'el-rompido', name: 'El Rompido', region: 'Andalucía', type: 'mar', lat: 37.22, lon: -7.12, known: ATLANTICO_SUR },
  { slug: 'punta-umbria', name: 'Punta Umbría', region: 'Andalucía', type: 'mar', lat: 37.18, lon: -6.96, known: ATLANTICO_SUR },
  { slug: 'huelva', name: 'Huelva', region: 'Andalucía', type: 'mar', lat: 37.26, lon: -6.95, known: 'corvina y lubina en estuario y playa' },
  { slug: 'mazagon', name: 'Mazagón', region: 'Andalucía', type: 'mar', lat: 37.13, lon: -6.83, known: ATLANTICO_SUR },
  { slug: 'matalascanas', name: 'Matalascañas', region: 'Andalucía', type: 'mar', lat: 37.0, lon: -6.55, known: 'surfcasting en playa abierta' },

  // ── Cádiz ────────────────────────────────────────────────────────────────
  { slug: 'sanlucar', name: 'Sanlúcar de Barrameda', region: 'Andalucía', type: 'mar', lat: 36.77, lon: -6.35, known: 'desembocadura del Guadalquivir' },
  { slug: 'chipiona', name: 'Chipiona', region: 'Andalucía', type: 'mar', lat: 36.74, lon: -6.43, known: ATLANTICO_SUR },
  { slug: 'rota', name: 'Rota', region: 'Andalucía', type: 'mar', lat: 36.62, lon: -6.36, known: ATLANTICO_SUR },
  { slug: 'el-puerto-santa-maria', name: 'El Puerto de Santa María', region: 'Andalucía', type: 'mar', lat: 36.6, lon: -6.23, known: 'bahía de Cádiz, lubina y dorada' },
  { slug: 'puerto-real', name: 'Puerto Real', region: 'Andalucía', type: 'mar', lat: 36.53, lon: -6.19, known: 'bahía de Cádiz' },
  { slug: 'cadiz', name: 'Cádiz', region: 'Andalucía', type: 'mar', lat: 36.53, lon: -6.29, known: 'lubina, dorada y sargo desde playa y roca' },
  { slug: 'chiclana', name: 'Chiclana (Sancti Petri)', region: 'Andalucía', type: 'mar', lat: 36.42, lon: -6.15, known: 'caño de Sancti Petri, lubina y baila' },
  { slug: 'conil', name: 'Conil de la Frontera', region: 'Andalucía', type: 'mar', lat: 36.28, lon: -6.09, known: 'corvina y lubina en playa' },
  { slug: 'barbate', name: 'Barbate', region: 'Andalucía', type: 'mar', lat: 36.19, lon: -5.92, known: 'atún, lubina y corvina' },
  { slug: 'zahara-atunes', name: 'Zahara de los Atunes', region: 'Andalucía', type: 'mar', lat: 36.13, lon: -5.85, known: 'playa abierta, lubina y baila' },
  { slug: 'tarifa', name: 'Tarifa', region: 'Andalucía', type: 'mar', lat: 36.01, lon: -5.6, known: 'corrientes del Estrecho, lubina y bonito' },
  { slug: 'algeciras', name: 'Algeciras', region: 'Andalucía', type: 'mar', lat: 36.13, lon: -5.45, known: 'bahía de Algeciras, pesca de altura' },
  { slug: 'la-linea', name: 'La Línea de la Concepción', region: 'Andalucía', type: 'mar', lat: 36.17, lon: -5.35, known: 'roca y espigón del Estrecho' },

  // ── Málaga ───────────────────────────────────────────────────────────────
  { slug: 'estepona', name: 'Estepona', region: 'Andalucía', type: 'mar', lat: 36.43, lon: -5.15, known: MEDITERRANEO },
  { slug: 'manilva', name: 'Manilva', region: 'Andalucía', type: 'mar', lat: 36.38, lon: -5.25, known: MEDITERRANEO },
  { slug: 'marbella', name: 'Marbella', region: 'Andalucía', type: 'mar', lat: 36.51, lon: -4.89, known: MEDITERRANEO },
  { slug: 'fuengirola', name: 'Fuengirola', region: 'Andalucía', type: 'mar', lat: 36.54, lon: -4.62, known: MEDITERRANEO },
  { slug: 'benalmadena', name: 'Benalmádena', region: 'Andalucía', type: 'mar', lat: 36.6, lon: -4.52, known: MEDITERRANEO },
  { slug: 'torremolinos', name: 'Torremolinos', region: 'Andalucía', type: 'mar', lat: 36.62, lon: -4.5, known: MEDITERRANEO },
  { slug: 'malaga', name: 'Málaga', region: 'Andalucía', type: 'mar', lat: 36.72, lon: -4.42, known: 'pesca de playa y embarcación en el Mediterráneo' },
  { slug: 'velez-malaga', name: 'Torre del Mar', region: 'Andalucía', type: 'mar', lat: 36.74, lon: -4.1, known: MEDITERRANEO },
  { slug: 'nerja', name: 'Nerja', region: 'Andalucía', type: 'mar', lat: 36.75, lon: -3.87, known: 'roquero de la Axarquía' },

  // ── Granada ──────────────────────────────────────────────────────────────
  { slug: 'la-herradura', name: 'La Herradura', region: 'Andalucía', type: 'mar', lat: 36.73, lon: -3.73, known: COSTA_TROPICAL },
  { slug: 'almunecar', name: 'Almuñécar', region: 'Andalucía', type: 'mar', lat: 36.73, lon: -3.69, known: COSTA_TROPICAL },
  { slug: 'salobrena', name: 'Salobreña', region: 'Andalucía', type: 'mar', lat: 36.74, lon: -3.58, known: COSTA_TROPICAL },
  { slug: 'motril', name: 'Motril', region: 'Andalucía', type: 'mar', lat: 36.72, lon: -3.52, known: 'costa tropical, dentón y sargo' },
  { slug: 'castell-de-ferro', name: 'Castell de Ferro', region: 'Andalucía', type: 'mar', lat: 36.72, lon: -3.35, known: COSTA_TROPICAL },

  // ── Almería ──────────────────────────────────────────────────────────────
  { slug: 'adra', name: 'Adra', region: 'Andalucía', type: 'mar', lat: 36.75, lon: -3.02, known: MEDITERRANEO },
  { slug: 'roquetas', name: 'Roquetas de Mar', region: 'Andalucía', type: 'mar', lat: 36.76, lon: -2.61, known: MEDITERRANEO },
  { slug: 'aguadulce', name: 'Aguadulce', region: 'Andalucía', type: 'mar', lat: 36.81, lon: -2.55, known: MEDITERRANEO },
  { slug: 'almeria', name: 'Almería', region: 'Andalucía', type: 'mar', lat: 36.84, lon: -2.46, known: 'sargo, dorada y dentón' },
  { slug: 'cabo-de-gata', name: 'San José (Cabo de Gata)', region: 'Andalucía', type: 'mar', lat: 36.72, lon: -2.19, known: 'reserva marina, roqueo' },
  { slug: 'carboneras', name: 'Carboneras', region: 'Andalucía', type: 'mar', lat: 36.99, lon: -1.9, known: MEDITERRANEO },
  { slug: 'mojacar', name: 'Mojácar', region: 'Andalucía', type: 'mar', lat: 37.14, lon: -1.85, known: MEDITERRANEO },
  { slug: 'garrucha', name: 'Garrucha', region: 'Andalucía', type: 'mar', lat: 37.18, lon: -1.82, known: 'puerto pesquero, gamba roja' },
  { slug: 'vera', name: 'Vera', region: 'Andalucía', type: 'mar', lat: 37.25, lon: -1.86, known: MEDITERRANEO },

  // ── Murcia ───────────────────────────────────────────────────────────────
  { slug: 'aguilas', name: 'Águilas', region: 'Murcia', type: 'mar', lat: 37.41, lon: -1.58, known: 'roca y playa del litoral murciano' },
  { slug: 'mazarron', name: 'Mazarrón', region: 'Murcia', type: 'mar', lat: 37.6, lon: -1.31, known: 'roca y embarcación en el litoral murciano' },
  { slug: 'cartagena', name: 'Cartagena', region: 'Murcia', type: 'mar', lat: 37.6, lon: -0.98, known: 'spinning costero y pesca de roca' },
  { slug: 'la-manga', name: 'La Manga del Mar Menor', region: 'Murcia', type: 'mar', lat: 37.63, lon: -0.72, known: 'Mar Menor y Mediterráneo, dorada y lubina' },
  { slug: 'los-alcazares', name: 'Los Alcázares', region: 'Murcia', type: 'mar', lat: 37.74, lon: -0.85, known: 'Mar Menor, dorada y magre' },
  { slug: 'san-pedro-pinatar', name: 'San Pedro del Pinatar', region: 'Murcia', type: 'mar', lat: 37.81, lon: -0.79, known: 'Mar Menor y salinas' },

  // ── Comunidad Valenciana (Alicante) ──────────────────────────────────────
  { slug: 'pilar-horadada', name: 'Pilar de la Horadada', region: 'Comunidad Valenciana', type: 'mar', lat: 37.87, lon: -0.79, known: MEDITERRANEO },
  { slug: 'torrevieja', name: 'Torrevieja', region: 'Comunidad Valenciana', type: 'mar', lat: 37.98, lon: -0.68, known: 'salinas y playa, lubina y dorada' },
  { slug: 'guardamar', name: 'Guardamar del Segura', region: 'Comunidad Valenciana', type: 'mar', lat: 38.09, lon: -0.65, known: 'desembocadura del Segura' },
  { slug: 'santa-pola', name: 'Santa Pola', region: 'Comunidad Valenciana', type: 'mar', lat: 38.19, lon: -0.56, known: 'salinas y playa, lubina y dorada' },
  { slug: 'alicante', name: 'Alicante', region: 'Comunidad Valenciana', type: 'mar', lat: 38.35, lon: -0.48, known: 'lubina y sargo en el litoral' },
  { slug: 'campello', name: 'El Campello', region: 'Comunidad Valenciana', type: 'mar', lat: 38.43, lon: -0.4, known: MEDITERRANEO },
  { slug: 'villajoyosa', name: 'Villajoyosa', region: 'Comunidad Valenciana', type: 'mar', lat: 38.51, lon: -0.23, known: MEDITERRANEO },
  { slug: 'benidorm', name: 'Benidorm', region: 'Comunidad Valenciana', type: 'mar', lat: 38.53, lon: -0.13, known: MEDITERRANEO },
  { slug: 'altea', name: 'Altea', region: 'Comunidad Valenciana', type: 'mar', lat: 38.6, lon: -0.05, known: MEDITERRANEO },
  { slug: 'calpe', name: 'Calpe', region: 'Comunidad Valenciana', type: 'mar', lat: 38.64, lon: 0.04, known: 'Peñón de Ifach, roqueo y dentón' },
  { slug: 'moraira', name: 'Moraira', region: 'Comunidad Valenciana', type: 'mar', lat: 38.69, lon: 0.14, known: MEDITERRANEO },
  { slug: 'javea', name: 'Jávea', region: 'Comunidad Valenciana', type: 'mar', lat: 38.79, lon: 0.17, known: 'cabo de la Nao, dentón y sargo' },
  { slug: 'denia', name: 'Denia', region: 'Comunidad Valenciana', type: 'mar', lat: 38.84, lon: 0.11, known: 'sepia, dorada y lubina' },

  // ── Comunidad Valenciana (Valencia) ──────────────────────────────────────
  { slug: 'oliva', name: 'Oliva', region: 'Comunidad Valenciana', type: 'mar', lat: 38.92, lon: -0.12, known: MEDITERRANEO },
  { slug: 'gandia', name: 'Gandía', region: 'Comunidad Valenciana', type: 'mar', lat: 38.99, lon: -0.16, known: 'playa y puerto, lubina y sepia' },
  { slug: 'cullera', name: 'Cullera', region: 'Comunidad Valenciana', type: 'mar', lat: 39.16, lon: -0.25, known: 'desembocadura del Júcar' },
  { slug: 'valencia', name: 'Valencia', region: 'Comunidad Valenciana', type: 'mar', lat: 39.47, lon: -0.33, known: 'pesca de playa y puerto' },
  { slug: 'canet', name: "Canet d'en Berenguer", region: 'Comunidad Valenciana', type: 'mar', lat: 39.68, lon: -0.22, known: MEDITERRANEO },
  { slug: 'sagunto', name: 'Sagunto', region: 'Comunidad Valenciana', type: 'mar', lat: 39.68, lon: -0.24, known: MEDITERRANEO },

  // ── Comunidad Valenciana (Castellón) ─────────────────────────────────────
  { slug: 'burriana', name: 'Burriana', region: 'Comunidad Valenciana', type: 'mar', lat: 39.89, lon: -0.08, known: MEDITERRANEO },
  { slug: 'castellon', name: 'Castellón (Grao)', region: 'Comunidad Valenciana', type: 'mar', lat: 39.98, lon: -0.02, known: 'puerto y playa, lubina y dorada' },
  { slug: 'benicassim', name: 'Benicàssim', region: 'Comunidad Valenciana', type: 'mar', lat: 40.05, lon: 0.07, known: MEDITERRANEO },
  { slug: 'oropesa', name: 'Oropesa del Mar', region: 'Comunidad Valenciana', type: 'mar', lat: 40.09, lon: 0.14, known: MEDITERRANEO },
  { slug: 'peniscola', name: 'Peñíscola', region: 'Comunidad Valenciana', type: 'mar', lat: 40.36, lon: 0.4, known: 'roquero y curricán del Maestrat' },
  { slug: 'benicarlo', name: 'Benicarló', region: 'Comunidad Valenciana', type: 'mar', lat: 40.42, lon: 0.43, known: MEDITERRANEO },
  { slug: 'vinaros', name: 'Vinaròs', region: 'Comunidad Valenciana', type: 'mar', lat: 40.47, lon: 0.47, known: 'langostino y pesca de embarcación' },

  // ── Cataluña (Tarragona) ─────────────────────────────────────────────────
  { slug: 'sant-carles-rapita', name: 'Sant Carles de la Ràpita', region: 'Cataluña', type: 'mar', lat: 40.62, lon: 0.59, known: 'Delta del Ebro, corvina y lubina' },
  { slug: 'deltebre', name: 'Deltebre', region: 'Cataluña', type: 'mar', lat: 40.72, lon: 0.71, known: 'Delta del Ebro, lubina y anguila' },
  { slug: 'ampolla', name: "L'Ampolla", region: 'Cataluña', type: 'mar', lat: 40.81, lon: 0.71, known: MEDITERRANEO },
  { slug: 'ametlla-de-mar', name: "L'Ametlla de Mar", region: 'Cataluña', type: 'mar', lat: 40.88, lon: 0.8, known: 'roquero y embarcación de la Costa Daurada' },
  { slug: 'cambrils', name: 'Cambrils', region: 'Cataluña', type: 'mar', lat: 41.07, lon: 1.06, known: 'puerto pesquero, sepia y lubina' },
  { slug: 'salou', name: 'Salou', region: 'Cataluña', type: 'mar', lat: 41.08, lon: 1.14, known: MEDITERRANEO },
  { slug: 'tarragona', name: 'Tarragona', region: 'Cataluña', type: 'mar', lat: 41.12, lon: 1.25, known: 'roca y embarcación' },
  { slug: 'torredembarra', name: 'Torredembarra', region: 'Cataluña', type: 'mar', lat: 41.14, lon: 1.4, known: MEDITERRANEO },

  // ── Cataluña (Barcelona) ─────────────────────────────────────────────────
  { slug: 'vilanova', name: 'Vilanova i la Geltrú', region: 'Cataluña', type: 'mar', lat: 41.22, lon: 1.73, known: MEDITERRANEO },
  { slug: 'sitges', name: 'Sitges', region: 'Cataluña', type: 'mar', lat: 41.24, lon: 1.81, known: MEDITERRANEO },
  { slug: 'castelldefels', name: 'Castelldefels', region: 'Cataluña', type: 'mar', lat: 41.27, lon: 1.98, known: 'playa abierta, lubina y baila' },
  { slug: 'barcelona', name: 'Barcelona', region: 'Cataluña', type: 'mar', lat: 41.35, lon: 2.17, known: 'espigones y pesca de playa' },
  { slug: 'badalona', name: 'Badalona', region: 'Cataluña', type: 'mar', lat: 41.45, lon: 2.25, known: MEDITERRANEO },
  { slug: 'masnou', name: 'El Masnou', region: 'Cataluña', type: 'mar', lat: 41.48, lon: 2.31, known: MEDITERRANEO },
  { slug: 'premia', name: 'Premià de Mar', region: 'Cataluña', type: 'mar', lat: 41.49, lon: 2.36, known: MEDITERRANEO },
  { slug: 'mataro', name: 'Mataró', region: 'Cataluña', type: 'mar', lat: 41.53, lon: 2.44, known: MEDITERRANEO },
  { slug: 'arenys', name: 'Arenys de Mar', region: 'Cataluña', type: 'mar', lat: 41.58, lon: 2.55, known: 'puerto pesquero del Maresme' },
  { slug: 'calella', name: 'Calella', region: 'Cataluña', type: 'mar', lat: 41.61, lon: 2.66, known: MEDITERRANEO },

  // ── Cataluña (Girona · Costa Brava) ──────────────────────────────────────
  { slug: 'blanes', name: 'Blanes', region: 'Cataluña', type: 'mar', lat: 41.67, lon: 2.79, known: 'inicio de la Costa Brava' },
  { slug: 'lloret', name: 'Lloret de Mar', region: 'Cataluña', type: 'mar', lat: 41.7, lon: 2.85, known: MEDITERRANEO },
  { slug: 'tossa', name: 'Tossa de Mar', region: 'Cataluña', type: 'mar', lat: 41.72, lon: 2.93, known: 'roquero de la Costa Brava' },
  { slug: 'sant-feliu-guixols', name: 'Sant Feliu de Guíxols', region: 'Cataluña', type: 'mar', lat: 41.78, lon: 3.03, known: MEDITERRANEO },
  { slug: 'palamos', name: 'Palamós', region: 'Cataluña', type: 'mar', lat: 41.85, lon: 3.13, known: 'gamba de Palamós y embarcación' },
  { slug: 'begur', name: 'Begur', region: 'Cataluña', type: 'mar', lat: 41.95, lon: 3.21, known: 'calas y roqueo de la Costa Brava' },
  { slug: 'estartit', name: "L'Estartit", region: 'Cataluña', type: 'mar', lat: 42.05, lon: 3.2, known: 'islas Medes, roqueo' },
  { slug: 'lescala', name: "L'Escala", region: 'Cataluña', type: 'mar', lat: 42.12, lon: 3.13, known: 'golfo de Roses, lubina y sepia' },
  { slug: 'roses', name: 'Roses', region: 'Cataluña', type: 'mar', lat: 42.26, lon: 3.18, known: 'bahía de Roses, lubina y sepia' },
  { slug: 'cadaques', name: 'Cadaqués', region: 'Cataluña', type: 'mar', lat: 42.29, lon: 3.28, known: 'Cap de Creus, roqueo' },
  { slug: 'llanca', name: 'Llançà', region: 'Cataluña', type: 'mar', lat: 42.36, lon: 3.15, known: 'Costa Brava norte, roqueo' },
  { slug: 'port-de-la-selva', name: 'El Port de la Selva', region: 'Cataluña', type: 'mar', lat: 42.34, lon: 3.2, known: MEDITERRANEO },

  // ── Baleares ─────────────────────────────────────────────────────────────
  { slug: 'palma', name: 'Palma de Mallorca', region: 'Baleares', type: 'mar', lat: 39.57, lon: 2.65, known: 'roquero, cala y embarcación' },
  { slug: 'andratx', name: "Port d'Andratx", region: 'Baleares', type: 'mar', lat: 39.55, lon: 2.38, known: 'roqueo y curricán de Mallorca' },
  { slug: 'soller', name: 'Port de Sóller', region: 'Baleares', type: 'mar', lat: 39.8, lon: 2.69, known: 'sierra de Tramuntana, roqueo' },
  { slug: 'pollensa', name: 'Port de Pollença', region: 'Baleares', type: 'mar', lat: 39.91, lon: 3.08, known: 'bahía y roqueo del norte de Mallorca' },
  { slug: 'alcudia', name: 'Alcúdia', region: 'Baleares', type: 'mar', lat: 39.85, lon: 3.12, known: 'bahía de Alcúdia, lubina y llampuga' },
  { slug: 'cala-ratjada', name: 'Cala Ratjada', region: 'Baleares', type: 'mar', lat: 39.71, lon: 3.46, known: 'roqueo del levante mallorquín' },
  { slug: 'portocolom', name: 'Portocolom', region: 'Baleares', type: 'mar', lat: 39.42, lon: 3.26, known: 'cala y roqueo de Mallorca' },
  { slug: 'ciutadella', name: 'Ciutadella (Menorca)', region: 'Baleares', type: 'mar', lat: 40.0, lon: 3.84, known: 'roqueo y calas de Menorca' },
  { slug: 'mao', name: 'Maó (Menorca)', region: 'Baleares', type: 'mar', lat: 39.89, lon: 4.26, known: 'puerto natural, roqueo y curricán' },
  { slug: 'eivissa', name: 'Eivissa (Ibiza)', region: 'Baleares', type: 'mar', lat: 38.91, lon: 1.43, known: 'roquero y embarcación de Ibiza' },
  { slug: 'sant-antoni', name: 'Sant Antoni de Portmany', region: 'Baleares', type: 'mar', lat: 38.98, lon: 1.3, known: 'calas y roqueo de Ibiza' },
  { slug: 'santa-eularia', name: 'Santa Eulària des Riu', region: 'Baleares', type: 'mar', lat: 38.98, lon: 1.53, known: 'roqueo del levante de Ibiza' },
  { slug: 'formentera', name: 'Formentera (La Savina)', region: 'Baleares', type: 'mar', lat: 38.73, lon: 1.42, known: 'aguas cristalinas, roqueo y curricán' },

  // ── Canarias ─────────────────────────────────────────────────────────────
  { slug: 'las-palmas', name: 'Las Palmas de Gran Canaria', region: 'Canarias', type: 'mar', lat: 28.13, lon: -15.44, known: 'pesca de roca y embarcación atlántica' },
  { slug: 'puerto-mogan', name: 'Puerto de Mogán', region: 'Canarias', type: 'mar', lat: 27.82, lon: -15.76, known: 'pesca de altura, marlin y atún' },
  { slug: 'maspalomas', name: 'Maspalomas', region: 'Canarias', type: 'mar', lat: 27.74, lon: -15.6, known: CANARIO },
  { slug: 'santa-cruz-tenerife', name: 'Santa Cruz de Tenerife', region: 'Canarias', type: 'mar', lat: 28.47, lon: -16.25, known: 'roquero y pesca de altura' },
  { slug: 'puerto-de-la-cruz', name: 'Puerto de la Cruz', region: 'Canarias', type: 'mar', lat: 28.41, lon: -16.55, known: CANARIO },
  { slug: 'los-cristianos', name: 'Los Cristianos', region: 'Canarias', type: 'mar', lat: 28.05, lon: -16.72, known: 'pesca de altura del sur de Tenerife' },
  { slug: 'arrecife', name: 'Arrecife (Lanzarote)', region: 'Canarias', type: 'mar', lat: 28.96, lon: -13.55, known: CANARIO },
  { slug: 'playa-blanca', name: 'Playa Blanca (Lanzarote)', region: 'Canarias', type: 'mar', lat: 28.86, lon: -13.83, known: CANARIO },
  { slug: 'corralejo', name: 'Corralejo (Fuerteventura)', region: 'Canarias', type: 'mar', lat: 28.73, lon: -13.87, known: 'roquero y surfcasting de Fuerteventura' },
  { slug: 'puerto-del-rosario', name: 'Puerto del Rosario (Fuerteventura)', region: 'Canarias', type: 'mar', lat: 28.5, lon: -13.86, known: CANARIO },
  { slug: 'morro-jable', name: 'Morro Jable (Fuerteventura)', region: 'Canarias', type: 'mar', lat: 28.05, lon: -14.35, known: 'pesca de altura del Jable' },
  { slug: 'san-sebastian-gomera', name: 'San Sebastián de La Gomera', region: 'Canarias', type: 'mar', lat: 28.09, lon: -17.11, known: CANARIO },
  { slug: 'santa-cruz-la-palma', name: 'Santa Cruz de La Palma', region: 'Canarias', type: 'mar', lat: 28.68, lon: -17.76, known: CANARIO },
  { slug: 'valverde-hierro', name: 'La Restinga (El Hierro)', region: 'Canarias', type: 'mar', lat: 27.64, lon: -17.98, known: 'reserva marina, pesca de altura' },

  // ── Ceuta y Melilla ──────────────────────────────────────────────────────
  { slug: 'ceuta', name: 'Ceuta', region: 'Ceuta', type: 'mar', lat: 35.89, lon: -5.32, known: 'Estrecho de Gibraltar, lubina y dentón' },
  { slug: 'melilla', name: 'Melilla', region: 'Melilla', type: 'mar', lat: 35.29, lon: -2.94, known: 'Mar de Alborán, roqueo y embarcación' },

  // ── Interior (embalses y ríos) ───────────────────────────────────────────
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

/**
 * A small set of spots to prerender at build (kept short so the concurrent
 * weather fetches don't burst the provider). Every other spot generates
 * on-demand and is then cached by ISR.
 */
export const FEATURED_SPOT_SLUGS = ['cadiz', 'malaga', 'valencia', 'barcelona', 'a-coruna', 'las-palmas']
