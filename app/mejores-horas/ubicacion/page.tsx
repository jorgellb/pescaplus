import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import SpotDashboard from '@/components/forecast/SpotDashboard'
import { nearestSpot, type FishingSpot } from '@/lib/fishing-spots'

export const metadata: Metadata = {
  title: 'Previsión de pesca en tu ubicación',
  description: 'Previsión de pesca (viento, mareas, oleaje, solunar y mejores horas) para tu ubicación exacta.',
  robots: { index: false, follow: true },
}

type SP = { searchParams: Promise<{ lat?: string; lon?: string; especie?: string }> }

export default async function UbicacionPage({ searchParams }: SP) {
  const { lat, lon, especie } = await searchParams
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

  const base = `/mejores-horas/ubicacion?lat=${spot.lat}&lon=${spot.lon}`
  const speciesHref = (id: string | null) => (id ? `${base}&especie=${id}` : base)

  return <SpotDashboard spot={spot} especie={especie ?? null} speciesHref={speciesHref} subtitle={`Cerca de ${near.name}`} />
}
