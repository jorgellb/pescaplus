import { ImageResponse } from 'next/og'

export const alt = 'PescaPlus — Tienda especializada de pesca'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PAPER = '#f2efe6'
const INK = '#111111'
const ACCENT = '#0f766e'

export default function OpengraphImage() {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 22, height: 22, background: ACCENT }} />
          <div style={{ fontSize: 26, letterSpacing: 4, color: INK, fontWeight: 700, textTransform: 'uppercase' }}>
            Tienda especializada de pesca
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 168, fontWeight: 900, color: INK, lineHeight: 1, letterSpacing: -4, display: 'flex' }}>
            PESCA<span style={{ color: ACCENT }}>PLUS</span>
          </div>
          <div style={{ fontSize: 40, color: INK, marginTop: 24, maxWidth: 900 }}>
            Cañas · Carretes · Señuelos · Aparejos seleccionados por expertos
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: INK }}>66 productos · 11 categorías</div>
          <div style={{ background: INK, color: PAPER, fontSize: 28, fontWeight: 800, padding: '12px 24px', textTransform: 'uppercase' }}>
            Comprar ahora →
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
