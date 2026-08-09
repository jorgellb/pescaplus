import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Layout from '@/components/Layout'
import { SEA_SPECIES, MONTHS_SHORT } from '@/lib/fishing-species'
import SelectorAgua from '@/components/SelectorAgua'

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
      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Guía de especies</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Especies de mar</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            Qué se pesca en España, cuándo y cómo: temporada, horas, técnicas, cebos y las zonas donde se busca cada especie.
            Cada ficha conecta con la previsión de actividad por localidad.
          </p>
          <SelectorAgua activo="mar" />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SEA_SPECIES.map((sp, i) => {
            const inSeason = sp.bestMonths.includes(currentMonth)
            return (
              <Link
                key={sp.id}
                href={`/especies/${sp.id}`}
                className="group flex flex-col bg-paper border border-ink/10 rounded-2xl shadow-hard hover-shift overflow-hidden"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-ink/[0.05] border-b border-ink/[0.07]">
                  {sp.images[0] && (
                    <Image
                      src={sp.images[0]}
                      alt={`Foto de ${sp.name.toLowerCase()}`}
                      fill
                      /*
                       * El `sizes` anterior («50vw») mentía y salía caro. La
                       * rejilla vive dentro de `max-w-5xl` (1024 px) a dos
                       * columnas con 24 px de hueco: la tarjeta mide 476 px como
                       * mucho. Pero «50vw» en una pantalla de 1920 declara 960,
                       * así que el navegador pedía el candidato de 1080 px —y
                       * 2048 en pantallas del doble de densidad, por encima
                       * incluso del original, que tiene 1448 px de ancho.
                       *
                       * Importa porque cada tamaño nuevo obliga al servidor a
                       * codificar un AVIF, y eso aquí cuesta ~2 s por foto: son
                       * 29, y compitiendo por la CPU se estorban entre ellas
                       * (medido: 8 a la vez pasan de 2,0 s a 4,4-5,5 s cada una).
                       */
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) calc(50vw - 36px), 476px"
                      /*
                       * Las primeras de la rejilla se ven sin bajar la página, y
                       * `lazy` las dejaba a la cola. El resto sigue perezoso.
                       */
                      priority={i < 4}
                      className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  )}
                  {inSeason && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold bg-paper/95 text-accent border border-accent/40 rounded-full px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Temporada
                    </span>
                  )}
                </div>
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <h2 className="font-display uppercase text-2xl text-ink leading-none group-hover:text-accent transition-colors">{sp.name}</h2>
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
                </div>
              </Link>
            )
          })}
        </div>

        <p className="text-[12px] text-ink/60 mt-6">
          Temporadas y tallas orientativas: la normativa la fija cada administración. Combínalo con las{' '}
          <Link href="/mejores-horas" className="text-accent underline">mejores horas por localidad</Link> y el{' '}
          <Link href="/calendario" className="text-accent underline">calendario del pescador</Link>.
        </p>
      </section>
    </Layout>
  )
}
