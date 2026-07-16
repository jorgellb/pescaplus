import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SpotDashboard from '@/components/forecast/SpotDashboard'
import { FEATURED_SPOT_SLUGS, getSpot } from '@/lib/fishing-spots'

export const revalidate = 1800

type Params = { params: Promise<{ spot: string }>; searchParams: Promise<{ especie?: string; modo?: string }> }

export function generateStaticParams() {
  return FEATURED_SPOT_SLUGS.map((spot) => ({ spot }))
}

export async function generateMetadata({ params }: { params: Promise<{ spot: string }> }): Promise<Metadata> {
  const { spot } = await params
  const s = getSpot(spot)
  if (!s) return { title: 'Localidad no encontrada' }
  const extra = s.type === 'mar' ? 'mareas, viento, oleaje, ' : 'viento, '
  const title = s.type === 'mar' ? `Pesca en ${s.name}: mareas, viento, oleaje y mejores horas` : `Pesca en ${s.name}: viento y mejores horas`
  const description = `Previsión profesional de pesca en ${s.name} (${s.region}): ${extra}presión, temperatura del agua, periodos solunares y las mejores horas hora a hora${s.type === 'mar' ? ', con puntuación por especie' : ''}. Ideal para ${s.known}.`
  return { title, description, alternates: { canonical: `/mejores-horas/${s.slug}` } }
}

export default async function SpotPage({ params, searchParams }: Params) {
  const { spot } = await params
  const { especie, modo } = await searchParams
  const s = getSpot(spot)
  if (!s) notFound()

  const buildHref = (p: { especie: string | null; modo: string | null }) => {
    const q = new URLSearchParams()
    if (p.especie) q.set('especie', p.especie)
    if (p.modo) q.set('modo', p.modo)
    const qs = q.toString()
    return `/mejores-horas/${s.slug}${qs ? `?${qs}` : ''}`
  }

  return <SpotDashboard spot={s} especie={especie ?? null} modo={modo ?? null} buildHref={buildHref} />
}
