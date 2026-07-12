import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'

export function GET() {
  const size = 512
  return new ImageResponse(
    (
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
    ),
    { width: size, height: size },
  )
}
