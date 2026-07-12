import { ImageResponse } from 'next/og'
import { resolveProduct } from '@/lib/product-service'
import { getTaxonomy, categoryName } from '@/lib/taxonomy-store'

export const alt = 'PescaPlus — ficha de producto'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PAPER = '#f2efe6'
const INK = '#111111'
const ACCENT = '#0f766e'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [product, taxonomy] = await Promise.all([resolveProduct(id), getTaxonomy()])

  const rawTitle = product?.title ?? 'PescaPlus'
  const title = rawTitle.length > 96 ? `${rawTitle.slice(0, 94)}…` : rawTitle
  const modality = product ? categoryName(taxonomy, product.typeFishing) : 'Pesca'
  const price = product ? `${product.price.toFixed(2)} ${product.currency === 'EUR' ? '€' : product.currency}` : ''
  const titleSize = title.length > 64 ? 62 : title.length > 40 ? 78 : 96

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 20, height: 20, background: ACCENT }} />
            <div style={{ fontSize: 30, fontWeight: 800, color: INK, letterSpacing: -1, display: 'flex' }}>
              PESCA<span style={{ color: ACCENT }}>PLUS</span>
            </div>
          </div>
          <div
            style={{
              background: INK,
              color: PAPER,
              fontSize: 24,
              fontWeight: 800,
              padding: '10px 22px',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {modality}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1050 }}>
          <div style={{ fontSize: titleSize, fontWeight: 900, color: INK, lineHeight: 1.02, letterSpacing: -2, display: 'flex' }}>
            {title}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {price ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 84, fontWeight: 900, color: INK, letterSpacing: -2 }}>{price}</div>
            </div>
          ) : (
            <div />
          )}
          <div
            style={{
              background: ACCENT,
              color: PAPER,
              fontSize: 28,
              fontWeight: 800,
              padding: '14px 26px',
              textTransform: 'uppercase',
            }}
          >
            Ver ficha →
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
