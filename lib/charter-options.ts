/**
 * Catalogue of everything a patrón can declare about a charter and their boat.
 *
 * Structured as fixed option lists (id + label + icon) rather than free text so
 * that listings stay comparable, filterable and translatable — and so every
 * parameter can carry an icon. Ids are stored in the DB; labels are display-only
 * and can be reworded without a migration.
 */
export interface Option {
  id: string
  label: string
  /** Key into the CharterIcon set. */
  icon: string
}

export interface OptionGroup {
  id: string
  /** Section heading on the listing and in the operator form. */
  label: string
  /** Short helper shown to the patrón while filling the form. */
  hint: string
  icon: string
  options: Option[]
}

// ---------------------------------------------------------------------------
// Trip-level
// ---------------------------------------------------------------------------

export const TRIP_TYPES: Option[] = [
  { id: 'privada', label: 'Salida privada', icon: 'lock' },
  { id: 'compartida', label: 'Plazas compartidas', icon: 'users' },
]

export const LANGUAGES: Option[] = [
  { id: 'es', label: 'Español', icon: 'language' },
  { id: 'en', label: 'Inglés', icon: 'language' },
  { id: 'fr', label: 'Francés', icon: 'language' },
  { id: 'de', label: 'Alemán', icon: 'language' },
  { id: 'it', label: 'Italiano', icon: 'language' },
  { id: 'pt', label: 'Portugués', icon: 'language' },
  { id: 'ca', label: 'Catalán', icon: 'language' },
  { id: 'gl', label: 'Gallego', icon: 'language' },
  { id: 'eu', label: 'Euskera', icon: 'language' },
]

export const TECHNIQUES: Option[] = [
  { id: 'spinning', label: 'Spinning', icon: 'rod' },
  { id: 'jigging', label: 'Jigging', icon: 'jig' },
  { id: 'popping', label: 'Popping', icon: 'splash' },
  { id: 'curricán-costero', label: 'Curricán costero', icon: 'trolling' },
  { id: 'curricán-altura', label: 'Curricán de altura', icon: 'trolling' },
  { id: 'curricán-fondo', label: 'Curricán de fondo', icon: 'trolling' },
  { id: 'fondo', label: 'Pesca a fondo', icon: 'weight' },
  { id: 'vivo', label: 'Pesca al vivo', icon: 'livebait' },
  { id: 'brumeo', label: 'Pesca a brumeo', icon: 'chum' },
  { id: 'deriva', label: 'Pesca a la deriva', icon: 'drift' },
  { id: 'superficie', label: 'Pesca en superficie', icon: 'splash' },
  { id: 'eging', label: 'Eging (calamar)', icon: 'squid' },
  { id: 'chambel', label: 'Pesca al chambel', icon: 'hook' },
  { id: 'pulso', label: 'Pesca a pulso', icon: 'hook' },
  { id: 'biggame', label: 'Big game', icon: 'tuna' },
  { id: 'mosca', label: 'Pesca a mosca', icon: 'fly' },
]

export const FISHING_AREAS: Option[] = [
  { id: 'costa', label: 'Cerca de la costa', icon: 'coast' },
  { id: 'altamar', label: 'Alta mar', icon: 'offshore' },
  { id: 'arrecife', label: 'Arrecife y bajos', icon: 'reef' },
  { id: 'desembocadura', label: 'Desembocadura', icon: 'estuary' },
  { id: 'bahia', label: 'Bahía y puerto', icon: 'anchor' },
]

/** Target species — broader than the forecast species list, which is spot-based. */
export const TARGET_SPECIES: Option[] = [
  { id: 'atun-rojo', label: 'Atún rojo', icon: 'tuna' },
  { id: 'bacoreta', label: 'Bacoreta', icon: 'tuna' },
  { id: 'bonito', label: 'Bonito', icon: 'tuna' },
  { id: 'melva', label: 'Melva', icon: 'tuna' },
  { id: 'pez-limon', label: 'Pez limón / medregal', icon: 'fish' },
  { id: 'lubina', label: 'Lubina', icon: 'fish' },
  { id: 'dorada', label: 'Dorada', icon: 'fish' },
  { id: 'corvina', label: 'Corvina', icon: 'fish' },
  { id: 'denton', label: 'Dentón', icon: 'fish' },
  { id: 'pargo', label: 'Pargo', icon: 'fish' },
  { id: 'mero', label: 'Mero', icon: 'fish' },
  { id: 'sargo', label: 'Sargo', icon: 'fish' },
  { id: 'besugo', label: 'Besugo', icon: 'fish' },
  { id: 'llampuga', label: 'Llampuga / dorado', icon: 'fish' },
  { id: 'barracuda', label: 'Barracuda', icon: 'fish' },
  { id: 'jurel', label: 'Jurel', icon: 'fish' },
  { id: 'caballa', label: 'Caballa', icon: 'fish' },
  { id: 'palometon', label: 'Palometón', icon: 'fish' },
  { id: 'pez-espada', label: 'Pez espada', icon: 'swordfish' },
  { id: 'calamar', label: 'Calamar', icon: 'squid' },
  { id: 'sepia', label: 'Sepia', icon: 'squid' },
  { id: 'congrio', label: 'Congrio', icon: 'eel' },
  { id: 'raya', label: 'Raya', icon: 'ray' },
  { id: 'cabracho', label: 'Cabracho', icon: 'fish' },
]

export const POLICIES: Option[] = [
  { id: 'ninos', label: 'Se aceptan niños', icon: 'child' },
  { id: 'alcohol', label: 'Alcohol permitido', icon: 'drink' },
  { id: 'fumar', label: 'Permitido fumar', icon: 'smoking' },
  { id: 'no-fumar', label: 'Prohibido fumar', icon: 'nosmoking' },
  { id: 'captura-suelta', label: 'Captura y suelta de ejemplares pequeños', icon: 'release' },
  { id: 'protegidas', label: 'Liberación de toda especie protegida', icon: 'shield' },
  { id: 'mascotas', label: 'Se admiten mascotas', icon: 'pet' },
  { id: 'reparto-capturas', label: 'Las capturas se reparten', icon: 'share' },
]

export const SEASONS: Option[] = [
  { id: 'ene', label: 'Enero', icon: 'calendar' }, { id: 'feb', label: 'Febrero', icon: 'calendar' },
  { id: 'mar', label: 'Marzo', icon: 'calendar' }, { id: 'abr', label: 'Abril', icon: 'calendar' },
  { id: 'may', label: 'Mayo', icon: 'calendar' }, { id: 'jun', label: 'Junio', icon: 'calendar' },
  { id: 'jul', label: 'Julio', icon: 'calendar' }, { id: 'ago', label: 'Agosto', icon: 'calendar' },
  { id: 'sep', label: 'Septiembre', icon: 'calendar' }, { id: 'oct', label: 'Octubre', icon: 'calendar' },
  { id: 'nov', label: 'Noviembre', icon: 'calendar' }, { id: 'dic', label: 'Diciembre', icon: 'calendar' },
]

/** What the price covers. Shown as a ✓ list on the listing. */
export const INCLUDED: Option[] = [
  { id: 'patron', label: 'Patrón profesional', icon: 'captain' },
  { id: 'combustible', label: 'Combustible', icon: 'fuel' },
  { id: 'licencia', label: 'Licencia y permisos', icon: 'license' },
  { id: 'seguro', label: 'Seguro de ocupantes', icon: 'shield' },
  { id: 'equipo', label: 'Equipo de pesca completo', icon: 'rod' },
  { id: 'cebo', label: 'Cebo y señuelos', icon: 'lure' },
  { id: 'bebidas', label: 'Agua y refrescos', icon: 'drink' },
  { id: 'snacks', label: 'Aperitivos', icon: 'snack' },
  { id: 'comida', label: 'Comida', icon: 'meal' },
  { id: 'hielo', label: 'Hielo para las capturas', icon: 'ice' },
  { id: 'fotos', label: 'Fotos de la jornada', icon: 'camera' },
  { id: 'traslado', label: 'Traslado al puerto', icon: 'car' },
]

/** What the angler must bring / pay apart. */
export const EXCLUDED: Option[] = [
  { id: 'comida-no', label: 'Comida', icon: 'meal' },
  { id: 'bebidas-no', label: 'Bebidas', icon: 'drink' },
  { id: 'crema', label: 'Crema solar', icon: 'sun' },
  { id: 'mareo', label: 'Pastillas para el mareo', icon: 'pill' },
  { id: 'propina', label: 'Propina al patrón', icon: 'euro' },
  { id: 'licencia-no', label: 'Licencia de pesca personal', icon: 'license' },
  { id: 'traslado-no', label: 'Traslado al puerto', icon: 'car' },
]

// ---------------------------------------------------------------------------
// Boat-level (live on the operator profile: one boat per patrón)
// ---------------------------------------------------------------------------

export const NAVIGATION: Option[] = [
  { id: 'gps', label: 'GPS', icon: 'gps' },
  { id: 'sonda', label: 'Ecosonda', icon: 'sonar' },
  { id: 'sonar', label: 'Sónar', icon: 'sonar' },
  { id: 'localizador', label: 'Localizador de peces', icon: 'fishfinder' },
  { id: 'radar', label: 'Radar', icon: 'radar' },
  { id: 'vhf', label: 'Radio VHF', icon: 'radio' },
  { id: 'piloto', label: 'Piloto automático', icon: 'autopilot' },
  { id: 'plotter', label: 'Plotter / carta electrónica', icon: 'computer' },
  { id: '3d', label: 'Relieve del fondo 3D', icon: 'relief' },
  { id: 'ais', label: 'AIS', icon: 'radar' },
]

export const SAFETY: Option[] = [
  { id: 'chalecos', label: 'Chalecos salvavidas', icon: 'lifejacket' },
  { id: 'salvavidas', label: 'Aro salvavidas', icon: 'lifebuoy' },
  { id: 'balsa', label: 'Balsa salvavidas', icon: 'raft' },
  { id: 'baliza', label: 'Radiobaliza', icon: 'beacon' },
  { id: 'bengalas', label: 'Bengalas', icon: 'flare' },
  { id: 'extintores', label: 'Extintores', icon: 'extinguisher' },
  { id: 'botiquin', label: 'Botiquín', icon: 'firstaid' },
  { id: 'primeros-auxilios', label: 'Formación en primeros auxilios', icon: 'firstaid' },
  { id: 'rcp', label: 'Tripulación con RCP', icon: 'heart' },
  { id: 'luces', label: 'Luces de navegación', icon: 'lights' },
  { id: 'escalera', label: 'Escalera de baño', icon: 'ladder' },
]

export const BOAT_AMENITIES: Option[] = [
  { id: 'cabina', label: 'Cabina cubierta', icon: 'cabin' },
  { id: 'wc', label: 'Aseo a bordo', icon: 'wc' },
  { id: 'toldo', label: 'Toldo / sombra', icon: 'awning' },
  { id: 'solarium', label: 'Solárium', icon: 'sun' },
  { id: 'nevera', label: 'Nevera con hielo', icon: 'ice' },
  { id: 'vivero', label: 'Vivero de cebo', icon: 'livewell' },
  { id: 'caneros', label: 'Cañeros', icon: 'rodholder' },
  { id: 'multimedia', label: 'Equipo de música', icon: 'multimedia' },
  { id: 'ayudante', label: 'Ayudante / aparejador', icon: 'mate' },
  { id: 'ducha', label: 'Ducha de agua dulce', icon: 'shower' },
]

export const FISHING_GEAR: Option[] = [
  { id: 'canas', label: 'Cañas de pescar', icon: 'rod' },
  { id: 'carretes', label: 'Carretes', icon: 'reel' },
  { id: 'senuelos', label: 'Señuelos', icon: 'lure' },
  { id: 'cebo-vivo', label: 'Cebo vivo', icon: 'livebait' },
  { id: 'arnes', label: 'Arnés de lucha', icon: 'harness' },
  { id: 'cinturon', label: 'Cinturón de combate', icon: 'belt' },
  { id: 'caneros-rocket', label: 'Cañeros rocket', icon: 'rodholder' },
  { id: 'downrigger', label: 'Downrigger', icon: 'weight' },
  { id: 'teasers', label: 'Teasers y brumeo', icon: 'chum' },
]

// ---------------------------------------------------------------------------
// Grouping used by the form and the listing (keeps both in step).
// ---------------------------------------------------------------------------

export const TRIP_GROUPS: OptionGroup[] = [
  { id: 'techniques', label: 'Técnicas de pesca', hint: 'Qué modalidades practicaréis a bordo.', icon: 'rod', options: TECHNIQUES },
  { id: 'species', label: 'Especies objetivo', hint: 'A qué vais a pescar (según temporada).', icon: 'fish', options: TARGET_SPECIES },
  { id: 'areas', label: 'Zonas de pesca', hint: 'Dónde se pesca durante la salida.', icon: 'offshore', options: FISHING_AREAS },
  { id: 'included', label: 'Incluido en el precio', hint: 'Lo que el pescador NO tiene que pagar aparte.', icon: 'check', options: INCLUDED },
  { id: 'excluded', label: 'No incluido', hint: 'Lo que debe traer o pagar aparte.', icon: 'cross', options: EXCLUDED },
  { id: 'policies', label: 'Normas a bordo', hint: 'Reglas de la embarcación.', icon: 'shield', options: POLICIES },
  { id: 'languages', label: 'Idiomas', hint: 'En qué idiomas atendéis.', icon: 'language', options: LANGUAGES },
  { id: 'seasons', label: 'Temporada', hint: 'Meses en los que ofrecéis esta salida.', icon: 'calendar', options: SEASONS },
]

export const BOAT_GROUPS: OptionGroup[] = [
  { id: 'navigation', label: 'Electrónica y navegación', hint: 'Lo que lleva tu barco para encontrar el pescado.', icon: 'radar', options: NAVIGATION },
  { id: 'safety', label: 'Seguridad', hint: 'Equipamiento de seguridad a bordo.', icon: 'lifebuoy', options: SAFETY },
  { id: 'amenities', label: 'Comodidades', hint: 'Qué encontrará el pescador a bordo.', icon: 'cabin', options: BOAT_AMENITIES },
  { id: 'gear', label: 'Aparejos disponibles', hint: 'Material de pesca que pones tú.', icon: 'reel', options: FISHING_GEAR },
]

/** Resolve ids → options, dropping anything unknown (labels can change safely). */
export function resolveOptions(all: Option[], ids: string[] | undefined | null): Option[] {
  if (!ids?.length) return []
  const byId = new Map(all.map((o) => [o.id, o]))
  return ids.map((id) => byId.get(id)).filter((o): o is Option => !!o)
}

/** Keep only ids that exist in the catalogue (validation for writes). */
export function sanitizeIds(all: Option[], ids: unknown, max = 60): string[] {
  if (!Array.isArray(ids)) return []
  const valid = new Set(all.map((o) => o.id))
  return [...new Set(ids.filter((x): x is string => typeof x === 'string' && valid.has(x)))].slice(0, max)
}
