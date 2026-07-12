import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'

function BrandMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0f766e',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.62,
        fontWeight: 900,
        fontFamily: 'sans-serif',
      }}
    >
      P
    </div>
  )
}

export function GET() {
  const size = 192
  return new ImageResponse(<BrandMark size={size} />, { width: size, height: size })
}
