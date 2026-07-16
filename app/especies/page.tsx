import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { SEA_SPECIES, MONTHS_SHORT } from '@/lib/fishing-species'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Especies de pesca en el mar: temporadas, técnicas y zonas',
  description:
    'Fichas de las especies más buscadas de la pesca marítima en España: lubina, dorada, sargo, corvina, dentón y pelágicos. Temporada, técnicas, cebos y dónde pescarlas.',
  alternates: { canonical: '/especies' },
}

export default function EspeciesHub() {
  const currentMonth = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', month: 'numeric' }).format(new Date()))

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Guía de especies</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Especies de mar</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            Qué se pesca en España, cuándo y cómo: temporada, horas, técnicas, cebos y las zonas donde se busca cada especie.
            Cada ficha conecta con la previsión de actividad por localidad.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SEA_SPECIES.map((sp) => {
            const inSeason = sp.bestMonths.includes(currentMonth)
            return (
              <Link
                key={sp.id}
                href={`/especies/${sp.id}`}
                className="group border border-ink/15 rounded-2xl bg-paper shadow-hard hover-shift p-5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display uppercase text-2xl text-ink leading-none group-hover:text-accent transition-colors">{sp.name}</h2>
                  {inSeason && (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-accent border border-accent/40 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Temporada
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-ink/60 leading-relaxed flex-1">{sp.tagline}.</p>
                <div className="grid grid-cols-12 gap-[2px]">
                  {MONTHS_SHORT.map((mo, idx) => (
                    <span
                      key={mo}
                      title={mo}
                      className={`h-1.5 rounded-sm ${sp.bestMonths.includes(idx + 1) ? 'bg-accent' : 'bg-ink/10'} ${idx + 1 === currentMonth ? 'ring-1 ring-ink/50' : ''}`}
                    />
                  ))}
                </div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">Ver ficha →</span>
              </Link>
            )
          })}
        </div>

        <p className="text-[12px] text-ink/50 mt-6">
          Temporadas y tallas orientativas: la normativa la fija cada administración. Combínalo con las{' '}
          <Link href="/mejores-horas" className="text-accent underline">mejores horas por localidad</Link> y el{' '}
          <Link href="/calendario" className="text-accent underline">calendario del pescador</Link>.
        </p>
      </section>
    </Layout>
  )
}
