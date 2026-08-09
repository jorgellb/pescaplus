import { FISHING_TYPES } from '@/lib/fishing'

/**
 * The site's navigation map — a single source of truth for the header, the
 * mobile drawer and the footer, so the three can never drift apart.
 *
 * Written for SEO as much as for people: every link carries descriptive anchor
 * text ("Chárters con patrón", not "Chárters") plus a one-line `hint` that also
 * serves as the menu's supporting copy. That way the crawler and a first-time
 * visitor learn the same thing — that PescaPlus is a shop AND a set of fishing
 * tools AND a marketplace of trips.
 */
export interface NavLink {
  href: string
  label: string
  /** Supporting line shown under the label in the mega-menu. */
  hint?: string
  emoji?: string
}

export interface NavSection {
  id: string
  label: string
  /** Where the section header itself points (its hub page). */
  href: string
  /** Short pitch shown at the top of the panel. */
  tagline: string
  links: NavLink[]
  /** Product categories are rendered as a dense icon grid instead of a list. */
  variant?: 'categories' | 'list'
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'tienda',
    label: 'Tienda',
    href: '/mejores',
    tagline: 'Aparejos seleccionados por pescadores, al mejor precio.',
    variant: 'categories',
    links: [
      ...FISHING_TYPES.map((t) => ({ href: `/categories/${t.id}`, label: t.name })),
    ],
  },
  {
    id: 'cuando',
    label: 'Cuándo pescar',
    href: '/mejores-horas',
    tagline: 'Mareas, viento y actividad solunar para elegir el mejor momento.',
    links: [
      { href: '/mejores-horas', label: 'Mejores horas para pescar', hint: 'Previsión por zona, hora a hora', emoji: '🕐' },
      { href: '/calendario', label: 'Calendario de pesca', hint: 'Luna, mareas y días buenos del mes', emoji: '📅' },
      { href: '/mejores-horas/comparar', label: 'Comparar zonas', hint: 'Dos puntos enfrentados el mismo día', emoji: '⚖️' },
      { href: '/mejores-horas/ubicacion', label: 'Cerca de mí', hint: 'La mejor zona según dónde estás', emoji: '📍' },
    ],
  },
  {
    id: 'donde',
    label: 'Dónde pescar',
    href: '/donde-pescar',
    tagline: 'Mapa de zonas y fichas de especies con sus mejores momentos.',
    links: [
        { href: '/aqui', label: 'Aquí y ahora', hint: 'Sonda, fondo y normativa de tu punto exacto', emoji: '🎯' },
      { href: '/donde-pescar', label: 'Mapa del día', hint: 'Dónde pica mejor hoy en España', emoji: '🗺️' },
      { href: '/carta', label: 'Carta náutica', hint: 'Balizamiento y profundidad del litoral', emoji: '🧭' },
      { href: '/pesca', label: 'Qué pescar y dónde', hint: 'Guía por especie y zona del litoral', emoji: '🎯' },
      { href: '/especies', label: 'Especies de mar', hint: 'Lubina, dorada, atún… cómo y cuándo', emoji: '🐟' },
      { href: '/rio', label: 'Agua dulce', hint: 'Black bass, lucio, trucha, barbo, siluro', emoji: '🎣' },
      { href: '/nudos', label: 'Nudos y montajes', hint: 'Palomar, FG, plomo corredizo, al pelo…', emoji: '🪢' },
      { href: '/mejores-horas', label: 'Zonas de pesca', hint: 'Puertos y playas con previsión propia', emoji: '⚓' },
      { href: '/diario', label: 'Diario de capturas', hint: 'Registra lo que pescas y con qué', emoji: '📖' },
    ],
  },
  {
    id: 'salidas',
    label: 'Salidas',
    href: '/charters',
    tagline: 'Sal a pescar acompañado: con patrón profesional o con otros pescadores.',
    links: [
      { href: '/charters', label: 'Chárters con patrón', hint: 'Salidas con licencia y seguro, reserva y paga online', emoji: '🚤' },
      { href: '/quedadas', label: 'Quedadas de pesca', hint: 'Comparte barco y gastos con otros pescadores', emoji: '🤝' },
      { href: '/quedadas/nueva', label: 'Organizar una quedada', hint: 'Publica tu salida en dos minutos', emoji: '➕' },
      { href: '/charters/operador', label: '¿Eres patrón?', hint: 'Ofrece tus salidas y cobra por adelantado', emoji: '🧭' },
    ],
  },
  {
    id: 'aprender',
    label: 'Aprender',
    href: '/guias',
    tagline: 'Guías, comparativas y un asesor que responde a tus dudas.',
    links: [
      { href: '/guias', label: 'Guías de pesca', hint: 'Técnicas y montajes explicados paso a paso', emoji: '📚' },
      { href: '/mejores', label: 'Comparativas y mejores', hint: 'Qué comprar según modalidad y presupuesto', emoji: '🏆' },
      { href: '/advice', label: 'Asesor de pesca', hint: 'Pregunta y te recomendamos aparejo', emoji: '🎣' },
      { href: '/contacto', label: 'Contacto', hint: 'Habla con nosotros', emoji: '✉️' },
    ],
  },
]

/** Extra links for the store panel, shown apart from the category grid. */
export const SHOP_SHORTCUTS: NavLink[] = [
  { href: '/mejores', label: 'Los mejores por categoría', emoji: '🏆' },
  { href: '/favoritos', label: 'Mis favoritos', emoji: '❤️' },
]
