import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { NUDOS, MONTAJES, type Ficha } from '@/lib/knots'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'
import { safeJsonLd } from '@/lib/json-ld'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Nudos y montajes de pesca: cómo se hacen, paso a paso',
  description:
    'Nudo palomar, clinch, FG, Albright, nudo de bucle. Y los montajes que más se usan: plomo corredizo, al pelo, texano. Paso a paso, con la resistencia real de cada nudo y los fallos que lo estropean.',
  alternates: { canonical: '/nudos' },
}

const DIF = ['', 'Fácil', 'Con práctica', 'Ensáyalo en casa']

function Tarjeta({ f }: { f: Ficha }) {
  return (
    <Link
      href={`/nudos/${f.id}`}
      className="group flex flex-col bg-paper border border-ink/10 rounded-2xl shadow-hard hover-shift overflow-hidden p-5 gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display uppercase text-xl text-ink leading-none group-hover:text-accent transition-colors">
          {f.name}
        </h3>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 shrink-0 border border-ink/[0.12] rounded px-1.5 py-0.5">
          {DIF[f.dificultad]}
        </span>
      </div>
      <p className="text-[14px] text-ink/80 leading-relaxed flex-1">{f.para}</p>
      {f.tipo === 'nudo' && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink/60">Resistencia: {f.resistencia}</p>
      )}
      <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">Cómo se hace →</span>
    </Link>
  )
}

export default function NudosHub() {
  const breadcrumbLd = breadcrumbJsonLd([{ name: 'Inicio', url: SITE_URL }, { name: 'Nudos y montajes' }])

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />

      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">Nudos y montajes</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Taller</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">
            Nudos y montajes
          </h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            Paso a paso, con la resistencia real de cada nudo y los fallos que lo estropean. Porque un nudo mal hecho
            convierte un hilo de diez kilos en uno de cinco, y no te enteras hasta que rompe.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10 sm:px-6 space-y-10">
        <div className="space-y-4">
          <h2 className="font-display uppercase text-2xl text-ink leading-none border-b border-ink/[0.07] pb-2">
            Nudos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {NUDOS.map((f) => <Tarjeta key={f.id} f={f} />)}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-display uppercase text-2xl text-ink leading-none border-b border-ink/[0.07] pb-2">
            Montajes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MONTAJES.map((f) => <Tarjeta key={f.id} f={f} />)}
          </div>
        </div>

        {/*
          * El consejo va aquí y no dentro de cada ficha porque vale para TODOS y
          * es el error que más líneas rompe: el nudo se calienta al apretarlo y
          * el daño no se ve por fuera.
          */}
        <div className="border border-ink/[0.07] rounded-xl bg-paper p-5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60 mb-2">
            Vale para todos los nudos
          </p>
          <p className="text-[15px] text-ink/80 leading-relaxed">
            <strong>Moja el nudo antes de apretarlo.</strong> Al cerrarse, las vueltas rozan entre sí y el calor quema el
            hilo por dentro: queda igual de bonito por fuera y con la mitad de resistencia. Un poco de saliva y apretar
            despacio es la diferencia entre sacar el pez y contar que se soltó.
          </p>
        </div>
      </section>
    </Layout>
  )
}
