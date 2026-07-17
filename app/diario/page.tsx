import type { Metadata } from 'next'
import Layout from '@/components/Layout'
import DiaryClient from '@/components/diario/DiaryClient'

export const metadata: Metadata = {
  title: 'Diario de capturas · tus patrones de pesca',
  description:
    'Tu diario de pesca privado: apunta capturas y descubre tus patrones — con qué luna, qué coeficiente de marea y en qué zonas pescas mejor. Todo queda en tu navegador.',
  alternates: { canonical: '/diario' },
}

export default function DiarioPage() {
  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Herramienta de pescador</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[1.02] text-ink">Diario de capturas</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            Apunta cada captura y deja que el diario cruce tus salidas con la astronomía del día: fase lunar, actividad
            solunar y coeficiente de marea. A partir de tres capturas verás <strong className="text-ink">tus propios
            patrones</strong>. Privado de verdad: todo se guarda en tu navegador y no se envía a ningún servidor.
          </p>
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <DiaryClient />
      </section>
    </Layout>
  )
}
