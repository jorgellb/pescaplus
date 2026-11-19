import { ImageResponse } from 'next/og'
import IconoApp from '@/components/brand/IconoApp'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<IconoApp lado={size.width} />, { ...size })
}
