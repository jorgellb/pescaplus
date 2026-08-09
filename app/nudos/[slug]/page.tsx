import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import Diagrama from '@/components/nudos/Diagrama'
import PasoSVG from '@/components/nudos/PasoSVG'
import { FICHAS, ficha } from '@/lib/knots'
import { getTaxonomy, categoryName } from '@/lib/taxonomy-store'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'
import { safeJsonLd } from '@/lib/json-ld'

export const revalidate = 86400

type Params = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return FICHAS.map((f) => ({ slug: f.id }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const f = ficha(slug)
  // Slug inventado: noindex. La página llama a notFound() pero Next responde 200.
  if (!f) return { title: 'No encontrado', robots: { index: false, follow: false } }
  return {
    title: `${f.name}: cómo se hace paso a paso`,
    description: `${f.para} ${f.tipo === 'nudo' ? `Conserva el ${f.resistencia}.` : ''} Paso a paso y los errores que lo estropean.`,
    alternates: { canonical: `/nudos/${f.id}` },
  }
}

const DIF = ['', 'Fácil', 'Con práctica', 'Ensáyalo en casa']

export default async function FichaNudo({ params }: Params) {
  const { slug } = await params
  const f = ficha(slug)
  if (!f) notFound()

  const taxonomy = await getTaxonomy()
  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: 'Nudos y montajes', url: `${SITE_URL}/nudos` },
    { name: f.name },
  ])

  /*
   * Datos estructurados de tipo HowTo. Es contenido de instrucciones paso a paso
   * y Google lo entiende como tal: con esto puede mostrarlo con los pasos
   * desplegados en el resultado, que es justo lo que busca quien tiene las manos
   * ocupadas y el móvil en la nevera.
   */
  const howToLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `Cómo hacer el ${f.name.toLowerCase()}`,
    description: f.para,
    step: f.pasos.map((p, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: p.t,
      text: p.d,
    })),
  }

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(howToLd) }} />

      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <Link href="/nudos" className="hover:text-accent">Nudos y montajes</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">{f.name}</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
            ● {f.tipo === 'nudo' ? 'Nudo' : 'Montaje'}
          </p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[1.02] text-ink">{f.name}</h1>
          <p className="text-[15px] text-ink/80 mt-3 max-w-2xl leading-relaxed">{f.para}</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-10 sm:px-6 space-y-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-ink/[0.07] rounded-xl bg-paper p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">Dificultad</p>
            <p className="font-display text-2xl leading-none mt-2 text-ink">{DIF[f.dificultad]}</p>
          </div>
          <div className="border border-ink/[0.07] rounded-xl bg-paper p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">
              {f.tipo === 'nudo' ? 'Resistencia' : 'Tipo'}
            </p>
            <p className="text-[15px] font-semibold mt-2 text-ink leading-snug">
              {f.tipo === 'nudo' ? f.resistencia : 'Montaje de aparejo'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-display uppercase text-2xl text-ink leading-none border-b border-ink/[0.07] pb-2">
            Cuándo usarlo
          </h2>
          <p className="text-[15px] text-ink/80 leading-relaxed">{f.cuando}</p>
        </div>

        {/* El esquema va ANTES de los pasos: ver el orden de las piezas hace que
          * los pasos se entiendan a la primera en vez de tener que imaginárselo. */}
        <Diagrama id={f.id} />

        <div className="space-y-4">
          <h2 className="font-display uppercase text-2xl text-ink leading-none border-b border-ink/[0.07] pb-2">
            Paso a paso
          </h2>
          <ol className="space-y-4">
            {f.pasos.map((p, i) => (
              <li key={p.t} className="flex gap-4">
                <span
                  aria-hidden
                  className="shrink-0 w-8 h-8 rounded-full bg-ink text-paper font-mono text-[13px] font-bold flex items-center justify-center"
                >
                  {i + 1}
                </span>
                <div className="pt-1">
                  <p className="font-semibold text-ink text-[15px]">{p.t}</p>
                  <p className="text-[15px] text-ink/80 leading-relaxed mt-0.5">{p.d}</p>
                  {/* El dibujo va junto a SU paso, no todos juntos al final: el
                    * texto y la imagen del mismo movimiento tienen que leerse a la
                    * vez o hay que ir y volver con las manos ocupadas. */}
                  <PasoSVG id={f.id} paso={i} />
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3 border border-ink/[0.07] rounded-xl bg-paper p-5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
            Lo que lo estropea
          </p>
          <ul className="space-y-2">
            {f.errores.map((e) => (
              <li key={e} className="text-[15px] text-ink/80 leading-relaxed flex gap-2.5">
                <span className="text-accent shrink-0" aria-hidden>✕</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>

        {/*
          * El enlace a la tienda va DESPUÉS de enseñar, nunca antes. Quien acaba
          * de aprender a empatar trenzado con fluorocarbono es exactamente quien
          * necesita fluorocarbono — pero si se lo pones delante del contenido,
          * la página deja de ser una guía y se convierte en un anuncio.
          */}
        {f.gearCats.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display uppercase text-2xl text-ink leading-none border-b border-ink/[0.07] pb-2">
              Lo que necesitas
            </h2>
            <div className="flex flex-wrap gap-2">
              {f.gearCats.map((c) => (
                <Link
                  key={c}
                  href={`/categories/${c}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-paper bg-ink hover:bg-accent px-3.5 py-2 rounded-lg transition-colors"
                >
                  {categoryName(taxonomy, c)} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {f.especies && f.especies.length > 0 && (
          <p className="text-[13px] text-ink/60">
            Se usa sobre todo con: <span className="text-ink">{f.especies.join(', ')}</span>.{' '}
            <Link href="/especies" className="text-accent underline">Ver las fichas de especie</Link>.
          </p>
        )}
      </section>
    </Layout>
  )
}
