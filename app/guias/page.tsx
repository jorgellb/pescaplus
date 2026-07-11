import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import ProductImage from '@/components/ProductImage'
import { listGuides } from '@/lib/guides-store'
import { fishingLabel } from '@/lib/fishing'
import { proxiedImage } from '@/lib/img-proxy'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Guías y consejos de pesca',
  description:
    'Guías de compra y consejos de pesca: cómo elegir cañas, carretes, señuelos y aparejos, técnicas y trucos por modalidad.',
  alternates: { canonical: '/guias' },
}

export default async function GuidesIndex() {
  const guides = await listGuides({ publishedOnly: true })

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Blog</p>
          <h1 className="font-display uppercase text-5xl md:text-7xl leading-[0.9] text-ink">
            Guías y consejos
          </h1>
          <p className="text-ink/60 text-sm md:text-base mt-4 max-w-xl">
            Cómo elegir tu equipo, técnicas y trucos para cada modalidad de pesca.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {guides.length === 0 ? (
          <div className="text-center py-20 border border-ink/15 rounded-xl shadow-hard bg-paper max-w-lg mx-auto px-8 space-y-4">
            <span className="inline-block text-5xl">📝</span>
            <h2 className="font-display uppercase text-2xl text-ink">Aún no hay guías</h2>
            <p className="text-sm text-ink/60">Vuelve pronto: estamos preparando contenido.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((g) => (
              <Link
                key={g.id}
                href={`/guias/${g.id}`}
                className="group flex flex-col bg-paper border border-ink/15 rounded-xl shadow-hard hover-shift"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#e6e2d6] border-b border-ink/12">
                  <ProductImage src={proxiedImage(g.coverImage, g.title)} alt={g.coverImageAlt || g.title} sizes="(max-width: 768px) 100vw, 33vw" className="absolute inset-0 w-full h-full object-cover" />
                  {g.typeFishing && (
                    <span className="absolute top-0 left-0 bg-ink text-paper text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5">
                      {fishingLabel(g.typeFishing)}
                    </span>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <time className="font-mono text-[11px] uppercase tracking-widest text-ink/40">
                    {new Date(g.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </time>
                  <h3 className="font-display uppercase text-xl leading-tight text-ink group-hover:text-accent transition-colors mt-2">
                    {g.title}
                  </h3>
                  <p className="text-sm text-ink/60 mt-2 line-clamp-3 flex-1">{g.excerpt}</p>
                  <span className="flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest text-accent mt-4">
                    Leer <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}
