import { ImageResponse } from 'next/og'
import IconoApp from '@/components/brand/IconoApp'

export const dynamic = 'force-static'

/** Icono del manifiesto (app/manifest.ts), también el «maskable». */
export function GET() {
  return new ImageResponse(<IconoApp lado={512} />, { width: 512, height: 512 })
}
