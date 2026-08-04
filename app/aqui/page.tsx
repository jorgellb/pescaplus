import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import AquiYAhora from '@/components/aqui/AquiYAhora'
import Icon from '@/components/icons/Icon'

export const metadata: Metadata = {
  title: 'Aquí y ahora: qué hay bajo tus pies',
  description:
    'Pulsa un botón y descubre los metros de agua bajo tus pies, el tipo de fondo, si estás dentro de un espacio protegido, en qué periodo solunar estás y qué especies entran en esta zona este mes. Funciona desde la orilla o desde el barco.',
  alternates: { canonical: '/aqui' },
}

export default function AquiPage() {
  return (
    <Layout>
      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mb-5">
            <Link href="/donde-pescar" className="hover:text-accent">Dónde pescar</Link>
            <span className="mx-1">/</span>
            <span className="text-ink">Aquí y ahora</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
            <Icon name="crosshair" className="w-3.5 h-3.5 inline -mt-0.5" strokeWidth={2} /> Tu posición exacta
          </p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">
            Qué hay<br />bajo tus pies
          </h1>
          <p className="text-ink/70 text-[15px] max-w-2xl mt-4 leading-relaxed">
            Un botón. Te digo los metros de agua que tienes debajo, de qué es el fondo, si estás dentro
            de un espacio protegido, en qué periodo solunar andas y qué entra por aquí este mes.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <AquiYAhora />
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <div className="border border-ink/[0.07] rounded-2xl bg-ink/[0.02] p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">De dónde salen los datos</p>
          <p className="text-[13px] text-ink/70 leading-relaxed mt-2">
            La sonda y el tipo de fondo vienen de los levantamientos batimétricos y de hábitats de{' '}
            <strong className="text-ink">EMODnet</strong>, con la referencia del levantamiento concreto a
            pie de dato. Los espacios protegidos, de sus autoridades (Red Natura 2000 y equivalentes). La
            actividad solunar se calcula aquí mismo a partir del sol y la luna de tu posición.
          </p>
          <p className="text-[13px] text-ink/70 leading-relaxed mt-3">
            <strong className="text-ink">Son datos de referencia, no una carta náutica oficial.</strong> No
            sustituyen a la sonda del barco ni a la cartografía oficial para navegar, y la normativa de
            cada espacio protegido hay que confirmarla en su fuente.
          </p>
        </div>
      </section>
    </Layout>
  )
}
