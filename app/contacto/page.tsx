import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import ContactForm from '@/components/ContactForm'

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Ponte en contacto con PescaPlus. Resolvemos tus dudas sobre aparejos, pedidos y recomendaciones de equipo de pesca.',
  alternates: { canonical: '/contacto' },
}

export default function ContactPage() {
  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span> <span className="text-ink">Contacto</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Estamos para ayudarte</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Contacto</h1>
          <p className="text-ink/60 text-sm max-w-xl mt-3">
            ¿Dudas sobre un aparejo, una recomendación o un pedido? Escríbenos y te ayudamos a acertar con tu equipo.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-10 sm:px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ContactForm />
        </div>

        <aside className="space-y-6">
          <div className="border border-ink/15 rounded-xl bg-paper p-5 space-y-2">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Antes de escribir</h2>
            <p className="text-sm text-ink/70 leading-relaxed">
              Muchas dudas de equipo las resuelve al instante nuestro{' '}
              <Link href="/advice" className="text-accent underline">asesor de pesca</Link> o nuestras{' '}
              <Link href="/guias" className="text-accent underline">guías de compra</Link>.
            </p>
          </div>
          <div className="border border-ink/15 rounded-xl bg-paper p-5 space-y-2">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Sobre las compras</h2>
            <p className="text-sm text-ink/70 leading-relaxed">
              Algunos enlaces son de afiliados: la compra se completa en la tienda del vendedor, con su propio proceso de
              envío, pago y devoluciones. Consulta nuestro{' '}
              <Link href="/aviso-legal" className="text-accent underline">aviso legal</Link>.
            </p>
          </div>
        </aside>
      </section>
    </Layout>
  )
}
