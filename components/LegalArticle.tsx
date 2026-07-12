import Link from 'next/link'
import Layout from '@/components/Layout'

export default function LegalArticle({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span> <span className="text-ink">{title}</span>
          </nav>
          <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[1.02] text-ink">{title}</h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink/40 mt-3">Última actualización: {updated}</p>
        </div>
      </section>

      <article
        className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-5 text-[15px] leading-relaxed text-ink/80
          [&_h2]:font-display [&_h2]:uppercase [&_h2]:text-xl [&_h2]:text-ink [&_h2]:mt-8 [&_h2]:mb-1
          [&_a]:text-accent [&_a]:underline
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
          [&_strong]:text-ink"
      >
        {children}
      </article>
    </Layout>
  )
}
