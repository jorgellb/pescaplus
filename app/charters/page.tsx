import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { listPublicCharters } from '@/lib/charters-store'
import { getSpot } from '@/lib/fishing-spots'
import { getSpecies } from '@/lib/fishing-species'
import { todayMadridISO, fmtDayLabel } from '@/lib/solunar-format'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Chárters de pesca en España: sal con patrón profesional',
  description: 'Reserva una salida de pesca con patrón profesional verificado (licencia y seguro): barco, día, precio por persona y previsión del día. Directorio de chárters de pesca por zona.',
  alternates: { canonical: '/charters' },
}

const MOD: Record<string, string> = { tierra: '🏖️', kayak: '🛶', barco: '🚤' }

export default async function ChartersHub() {
  const charters = await listPublicCharters(todayMadridISO())
  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">⚓ Chárters con patrón profesional</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Sal a pescar con un profesional</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">Reserva plaza en salidas de pesca con <strong className="text-ink">patrón profesional verificado</strong> (licencia y seguro comprobados). Con la previsión y la seguridad del día al lado.</p>
          <div className="mt-6">
            <Link href="/charters/operador" className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-accent hover:border-accent">
              ⚓ ¿Eres patrón? Ofrece tus salidas
            </Link>
          </div>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3 mb-5">Próximos chárters</h2>
        {charters.length === 0 ? (
          <div className="border border-ink/12 rounded-2xl bg-paper p-6 text-center text-ink/70">
            Aún no hay chárters publicados. ¿Eres patrón profesional? <Link href="/charters/operador" className="text-accent underline">Regístrate y ofrece tus salidas</Link>.
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {charters.map((c) => {
              const spot = getSpot(c.spotSlug); const sp = c.targetSpecies ? getSpecies(c.targetSpecies) : null
              return (
                <li key={c.id}>
                  <Link href={`/charters/${c.id}`} className="block border border-ink/12 rounded-2xl bg-paper p-4 hover:border-accent transition-colors h-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">{MOD[c.modality]} <span className="capitalize">{fmtDayLabel(c.dateISO)}</span> · {c.timeStart}</span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">{c.placesTaken}/{c.maxPlaces}</span>
                    </div>
                    <p className="font-display uppercase text-xl text-ink leading-none mt-2">{spot?.name ?? c.spotSlug}</p>
                    <p className="text-[13px] text-ink/65 mt-1">
                      {c.operator?.businessName || c.operator?.name} · patrón verificado ✓{sp ? ` · a por ${sp.name.toLowerCase()}` : ''}
                    </p>
                    <p className="text-[15px] font-bold text-ink mt-1">{c.pricePerPerson} €/persona</p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </Layout>
  )
}
