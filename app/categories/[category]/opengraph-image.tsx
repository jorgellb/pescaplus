import { ImageResponse } from 'next/og'
import { getFishingType } from '@/lib/fishing'
import { getTrendingRanked } from '@/lib/trending'
import { getTaxonomy, categoryName } from '@/lib/taxonomy-store'

export const alt = 'PescaPlus — categoría'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PAPER = '#f2efe6'
const INK = '#111111'
const ACCENT = '#0f766e'

export default async function Image({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const [products, taxonomy] = await Promise.all([getTrendingRanked(category), getTaxonomy()])
  const fishingType = getFishingType(category)

  const name = categoryName(taxonomy, category)
  const tagline = fishingType?.tagline ?? 'Los mejores aparejos para tus salidas de pesca.'
  const count = products.length
  const nameSize = name.length > 16 ? 108 : name.length > 11 ? 132 : 156

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: PAPER,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 56,
          border: `16px solid ${INK}`,
          boxSizing: 'border-box',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 20, height: 20, background: ACCENT }} />
          <div style={{ fontSize: 28, letterSpacing: 3, color: INK, fontWeight: 800, textTransform: 'uppercase' }}>
            Categoría · PescaPlus
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: nameSize, fontWeight: 900, color: INK, lineHeight: 0.98, letterSpacing: -3, textTransform: 'uppercase', display: 'flex' }}>
            {name}
          </div>
          <div style={{ fontSize: 38, color: INK, marginTop: 22, maxWidth: 980 }}>{tagline}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: INK }}>
            {count > 0 ? `${count} ${count === 1 ? 'producto' : 'productos'} seleccionados` : 'Selección de expertos'}
          </div>
          <div style={{ background: INK, color: PAPER, fontSize: 28, fontWeight: 800, padding: '14px 26px', textTransform: 'uppercase' }}>
            Ver categoría →
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
