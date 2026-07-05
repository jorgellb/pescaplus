import type { Product } from '@/types'

/**
 * Curated, in-memory product catalog. This is the source of truth for the demo:
 * the app is fully browsable with zero external services (no database, no
 * AliExpress credentials). The database and the AliExpress API are optional
 * enhancements layered on top of this catalog — see app/api/products/route.ts.
 *
 * Each entry has a stable, human-readable `id` (used in /products/[id] URLs) so
 * links survive restarts and don't depend on database-generated identifiers.
 */
type CatalogSeed = Omit<Product, 'images' | 'videoUrl' | 'seoDescription' | 'aiOptimized'> &
  Partial<Pick<Product, 'images' | 'videoUrl' | 'seoDescription' | 'aiOptimized'>>

const CATALOG_SEED: CatalogSeed[] = [
  {
    id: 'spinning-reel-kastking-sharky-iii',
    aliexpressId: 'mock_spinning_reel_1',
    title: 'Carrete de Spinning KastKing Sharky III · Freno de 15 kg',
    description:
      'El KastKing Sharky III es un carrete de spinning sellado impermeable, ideal para agua dulce y salada. Cuenta con un eje principal de acero inoxidable y engranajes de latón de precisión. Su potencia de freno de hasta 15 kg te permitirá capturar peces de gran tamaño con total control.',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
    price: 45.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'spinning',
    rating: 4.8,
    reviews: 1240,
    inStock: true,
  },
  {
    id: 'spinning-rod-sougayilang-telescopic',
    aliexpressId: 'mock_spinning_rod_1',
    title: 'Caña Telescópica de Carbono Sougayilang · Acción Rápida',
    description:
      'Fabricada con fibra de carbono de alta densidad combinada con fibra de vidrio, esta caña telescópica es fuerte y duradera. Ligera y portátil, resulta muy fácil de transportar para pescar en lagos, ríos o mar abierto.',
    imageUrl: 'https://images.unsplash.com/photo-1516962126636-27ad087061cc?auto=format&fit=crop&w=600&q=80',
    price: 29.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'spinning',
    rating: 4.7,
    reviews: 850,
    inStock: true,
  },
  {
    id: 'spinning-lures-minnow-kit-mustad',
    aliexpressId: 'mock_spinning_lures_1',
    title: 'Kit de Señuelos Minnow (10 piezas) con Triples Mustad',
    description:
      'Kit de 10 señuelos tipo minnow en colores variados con ojos 3D realistas y bolas de acero interiores que emiten sonido al moverse. Equipados con anzuelos triples Mustad súper afilados para asegurar las picadas.',
    imageUrl: 'https://images.unsplash.com/photo-1501869125301-4aa840cfbd43?auto=format&fit=crop&w=600&q=80',
    price: 12.5,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'spinning',
    rating: 4.6,
    reviews: 450,
    inStock: true,
  },
  {
    id: 'fly-combo-maxcatch-extreme',
    aliexpressId: 'mock_fly_combo_1',
    title: 'Combo de Pesca con Mosca Maxcatch Extreme · Caña, Carrete y Línea',
    description:
      'El kit de inicio perfecto de Maxcatch. Incluye una caña de mosca de carbono de 4 secciones, un carrete de aluminio fundido precargado con línea flotante de alta visibilidad, backing y terminal de línea. Viene con funda protectora rígida.',
    imageUrl: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=600&q=80',
    price: 89.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'flyfishing',
    rating: 4.9,
    reviews: 310,
    inStock: true,
  },
  {
    id: 'fly-box-dry-nymph-120',
    aliexpressId: 'mock_fly_box_1',
    title: 'Caja de Moscas Secas y Ninfas Impermeable (120 uds)',
    description:
      'Una cuidada selección de 120 moscas realistas hechas a mano (secas, ahogadas, ninfas y streamers), ideales para trucha y salmón. Vienen en una caja impermeable de doble cara con espuma de alta densidad.',
    imageUrl: 'https://images.unsplash.com/photo-1499243619894-6743235ac57b?auto=format&fit=crop&w=600&q=80',
    price: 18.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'flyfishing',
    rating: 4.8,
    reviews: 180,
    inStock: true,
  },
  {
    id: 'fly-line-wf-floating',
    aliexpressId: 'mock_fly_line_1',
    title: 'Línea de Mosca Flotante Weight Forward (WF) · Conexión Suave',
    description:
      'Línea de mosca con distribución de peso hacia el frente (Weight Forward) para lances más largos y precisos. Recubrimiento de PVC suave y alma trenzada de baja elasticidad. Cuenta con micro bucles soldados en los extremos.',
    imageUrl: 'https://images.unsplash.com/photo-1445217143695-467124038776?auto=format&fit=crop&w=600&q=80',
    price: 15.45,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'flyfishing',
    rating: 4.5,
    reviews: 95,
    inStock: true,
  },
  {
    id: 'carp-alarms-hirisi-wireless',
    aliexpressId: 'mock_carp_alarms_1',
    title: 'Juego de Alarmas de Mordida Inalámbricas Hirisi (3+1)',
    description:
      'Conjunto de 3 alarmas de mordida de alta sensibilidad y 1 receptor inalámbrico. Rango de señal de hasta 150 m, volumen y tono ajustables, luz LED de picada con memoria y conector jack para swingers iluminados.',
    imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80',
    price: 49.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'carp',
    rating: 4.7,
    reviews: 220,
    inStock: true,
  },
  {
    id: 'carp-rod-hirisi-3lb',
    aliexpressId: 'mock_carp_rod_1',
    title: 'Caña de Carpa de Carbono Hirisi · 3.6 m / 3.0 lbs',
    description:
      'Caña de carpa de acción progresiva con potencia de 3.0 lbs, ideal para lances a grandes distancias y peleas potentes. Anillas de óxido de aluminio SIC de gran tamaño y empuñadura ergonómica de goma antideslizante.',
    imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80',
    price: 38.5,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'carp',
    rating: 4.6,
    reviews: 140,
    inStock: true,
  },
  {
    id: 'carp-bait-tool-kit',
    aliexpressId: 'mock_carp_accessories_1',
    title: 'Kit de Herramientas de Cebo para Carpa y Agujas de Montaje',
    description:
      'Kit completo para carpfishing con 4 agujas de distintos estilos para enhebrar boiles, maíz o pellets en el hair rig, junto con tijeras de trenzado y un extractor de nudos.',
    imageUrl: 'https://images.unsplash.com/photo-1510018772980-59d5d5f8b7c9?auto=format&fit=crop&w=600&q=80',
    price: 8.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'carp',
    rating: 4.4,
    reviews: 85,
    inStock: true,
  },
  {
    id: 'sea-reel-seaknight-surfcasting',
    aliexpressId: 'mock_sea_reel_1',
    title: 'Carrete de Surfcasting SeaKnight · Anticorrosión',
    description:
      'Diseñado específicamente para la dura pesca en mar. Posee un sistema de rodamientos de acero inoxidable sellado de 10+1 y una estructura de grafito de alta resistencia con bobina de aluminio forjado para lances ultra largos.',
    imageUrl: 'https://images.unsplash.com/photo-1564509027875-0b5c2b7f2f0f?auto=format&fit=crop&w=600&q=80',
    price: 54.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'sea',
    rating: 4.8,
    reviews: 520,
    inStock: true,
  },
  {
    id: 'sea-rod-sougayilang-3sec',
    aliexpressId: 'mock_sea_rod_1',
    title: 'Caña de Surfcasting Sougayilang · 3 Secciones · 4.2 m',
    description:
      'Robusta caña de surfcasting de 3 secciones fabricada con carbono reforzado. Ideal para pescar desde la orilla (playas, escolleras) con plomos pesados. Anillas tipo globo para evitar enredos con la línea.',
    imageUrl: 'https://images.unsplash.com/photo-1471197152781-361d6d5f8b7e?auto=format&fit=crop&w=600&q=80',
    price: 42.0,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'sea',
    rating: 4.6,
    reviews: 190,
    inStock: true,
  },
  {
    id: 'sea-hooks-high-carbon-100',
    aliexpressId: 'mock_sea_hooks_1',
    title: 'Anzuelos de Acero de Alto Carbono (100 uds)',
    description:
      'Anzuelos marinos reforzados y afilados químicamente para pesca en mar. Fabricados con acero de alto carbono para evitar la flexión ante picadas potentes. Resistentes a la corrosión salina.',
    imageUrl: 'https://images.unsplash.com/photo-1524704796725-9fc3044a58b2?auto=format&fit=crop&w=600&q=80',
    price: 5.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'sea',
    rating: 4.7,
    reviews: 310,
    inStock: true,
  },
  {
    id: 'baitcasting-reel-kastking-royale-legend-ii',
    aliexpressId: 'mock_baitcasting_reel_1',
    title: 'Carrete de Baitcasting KastKing Royale Legend II · Alta Velocidad',
    description:
      'El Royale Legend II ofrece una relación de transmisión rápida de 7.2:1 para recogidas veloces. Su freno magnético ajustable de 10 niveles elimina los nidos de pájaro. Sistema de arrastre de fibra de carbono ultra suave.',
    imageUrl: 'https://images.unsplash.com/photo-1611095564985-96f3a6a9f4f1?auto=format&fit=crop&w=600&q=80',
    price: 39.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'baitcasting',
    rating: 4.8,
    reviews: 890,
    inStock: true,
  },
  {
    id: 'baitcasting-rod-kastking-crixus',
    aliexpressId: 'mock_baitcasting_rod_1',
    title: 'Caña de Baitcasting KastKing Crixus · Carbono Toray',
    description:
      'Caña de baitcasting extremadamente sensible y reactiva, perfecta para lanzar señuelos ligeros a medianos con precisión quirúrgica. Diseñada con un blank de fibra de carbono de 24 toneladas Toray.',
    imageUrl: 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?auto=format&fit=crop&w=600&q=80',
    price: 34.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'baitcasting',
    rating: 4.7,
    reviews: 430,
    inStock: true,
  },
  {
    id: 'braided-line-pe-300m',
    aliexpressId: 'mock_braided_line_1',
    title: 'Hilo Trenzado PE (4 hebras · 300 m) · Alta Resistencia',
    description:
      'Línea trenzada superfina fabricada en PE con revestimiento de teflón para un deslizamiento óptimo por las anillas. Resistencia excepcional a la abrasión y estiramiento cero para una clavada instantánea.',
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80',
    price: 9.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'baitcasting',
    rating: 4.7,
    reviews: 620,
    inStock: true,
  },
  {
    id: 'accessories-tackle-backpack',
    aliexpressId: 'mock_accessories_backpack_1',
    title: 'Mochila Impermeable de Aparejos Multi-compartimiento',
    description:
      'Mochila de pesca táctica de gran capacidad, fabricada en nylon 1000D resistente al desgaste y al agua. Cuenta con soportes laterales para cañas, múltiples bolsillos con cremalleras bidireccionales y tiras reflectantes de seguridad.',
    imageUrl: 'https://images.unsplash.com/photo-1622260614153-03223fb72052?auto=format&fit=crop&w=600&q=80',
    price: 27.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'accessories',
    rating: 4.9,
    reviews: 520,
    inStock: true,
  },
  {
    id: 'accessories-aluminium-pliers',
    aliexpressId: 'mock_accessories_pliers_1',
    title: 'Alicates de Pesca de Aluminio y Cortador de Hilo',
    description:
      'Herramienta indispensable de aleación de aluminio anodizado. Cortador de línea trenzada de carburo de tungsteno súper afilado y mandíbulas de acero inoxidable con abridor de anillas y prensador de plomos.',
    imageUrl: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=600&q=80',
    price: 11.5,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'accessories',
    rating: 4.8,
    reviews: 410,
    inStock: true,
  },
  {
    id: 'accessories-lip-grip-digital-scale',
    aliexpressId: 'mock_accessories_grip_1',
    title: 'Pinza de Labios con Báscula Digital 25 kg',
    description:
      'Pinza de labios de pez profesional de aluminio ligero. Cuenta con báscula digital retroiluminada de hasta 25 kg / 55 lb, cinta métrica integrada y mango de goma EVA antideslizante con cordón de seguridad.',
    imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80',
    price: 16.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.aliexpress.com',
    category: 'fishing',
    typeFishing: 'accessories',
    rating: 4.6,
    reviews: 150,
    inStock: true,
  },
]

/** Fill media/SEO defaults so catalog seeds satisfy the full Product shape. */
export function withProductDefaults(p: CatalogSeed): Product {
  return {
    ...p,
    images: p.images?.length ? p.images : [p.imageUrl].filter(Boolean),
    videoUrl: p.videoUrl ?? '',
    seoDescription: p.seoDescription || p.description.slice(0, 160),
    aiOptimized: p.aiOptimized ?? false,
  }
}

export const CATALOG: readonly Product[] = CATALOG_SEED.map(withProductDefaults)

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Build a URL-safe, human-readable id from a product title. */
export function slugify(title: string): string {
  const base = normalizeText(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
  return base || 'producto'
}

export interface ProductFilter {
  search?: string
  typeFishing?: string
}

/**
 * Pure product filter: optional modality scope plus a case/diacritic-insensitive
 * search across title and description that matches every whitespace-separated term.
 * Works on any product list (catalog, DB or in-memory store).
 */
export function filterProducts(products: Product[], filter: ProductFilter = {}): Product[] {
  let result = products
  if (filter.typeFishing) {
    result = result.filter((p) => p.typeFishing === filter.typeFishing)
  }

  const terms = filter.search ? normalizeText(filter.search).split(/\s+/).filter(Boolean) : []
  if (terms.length === 0) return result

  return result.filter((product) => {
    const haystack = normalizeText(`${product.title} ${product.description}`)
    return terms.every((term) => haystack.includes(term))
  })
}
