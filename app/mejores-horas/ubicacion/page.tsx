import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import SpotDashboard from '@/components/forecast/SpotDashboard'
import { nearestSpot, type FishingSpot } from '@/lib/fishing-spots'

export const metadata: Metadata = {
  title: 'Previsión de pesca en tu ubicación',
  description: 'Previsión de pesca (viento, mareas, oleaje, solunar y mejores horas) para tu ubicación exacta.',
  robots: { index: false, follow: true },
}

type SP = { searchParams: Promise<{ lat?: string; lon?: string; especie?: string; modo?: string }> }

export default async function UbicacionPage({ searchParams }: SP) {
  const { lat, lon, especie, modo } = await searchParams
  const la = Number.parseFloat(lat ?? '')
  const lo = Number.parseFloat(lon ?? '')
  if (!Number.isFinite(la) || !Number.isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) {
    redirect('/mejores-horas')
  }

  const near = nearestSpot(la, lo)
  const spot: FishingSpot = {
    slug: 'ubicacion',
    name: 'Tu ubicación',
    region: near.region,
    type: near.type,
    lat: Math.round(la * 1000) / 1000,
    lon: Math.round(lo * 1000) / 1000,
    known: near.known,
  }

  const buildHref = (p: { especie: string | null; modo: string | null }) => {
    const q = new URLSearchParams({ lat: String(spot.lat), lon: String(spot.lon) })
    if (p.especie) q.set('especie', p.especie)
    if (p.modo) q.set('modo', p.modo)
    return `/mejores-horas/ubicacion?${q.toString()}`
  }

  return <SpotDashboard spot={spot} especie={especie ?? null} modo={modo ?? null} buildHref={buildHref} subtitle={`Cerca de ${near.name}`} />
}
