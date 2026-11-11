import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'
import Layout from '@/components/Layout'
import ProductCard from '@/components/ProductCard'
import ProductImage from '@/components/ProductImage'
import ProductGallery from '@/components/ProductGallery'
import AsesorButton from '@/components/AsesorButton'
import FavoriteButton from '@/components/FavoriteButton'
import RecentTracker from '@/components/RecentTracker'
import RecentlyViewed from '@/components/RecentlyViewed'
import { getTaxonomy, categoryName, subcategoriesOf } from '@/lib/taxonomy-store'
import { proxiedImage, absoluteProxiedImage } from '@/lib/img-proxy'
import { resolveProduct } from '@/lib/product-service'
import { listProducts } from '@/lib/products-store'
import { listGuides } from '@/lib/guides-store'
import { getTrendingProducts } from '@/lib/trending'
import { tituloDeRanking } from '@/lib/roundups'
import { renderDescription } from '@/lib/markdown'
import { CATALOG } from '@/lib/catalog'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'
import { safeJsonLd } from '@/lib/json-ld'
import { elSpecies } from '@/lib/fishing-species'
import { isFreshwater } from '@/lib/freshwater-species'
import {
  descripcionSeo,
  enumerar,
  precioEnTexto,
  preguntasDeProducto,
  productoJsonLd,
  recortarPorPalabras,
  tituloSeo,
  titulosRepetidos,
} from '@/lib/seo-producto'
import {
  complementosDe,
  especiesDeProducto,
  nudosDeProducto,
  productosParecidos,
  tecnicasDeProducto,
  temporada,
  TODAS_LAS_ESPECIES,
  vecinosDe,
  zonasParaEnlazar,
} from '@/lib/enlazado'
import Icon, { type IconName } from '@/components/icons/Icon'
import Stars from '@/components/Stars'

type Params = { params: Promise<{ id: string }> }

export const revalidate = 3600

export function generateStaticParams() {
  return CATALOG.map((p) => ({ id: p.id }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const [product, todos] = await Promise.all([resolveProduct(id), listProducts().catch((): Product[] => [])])
  // Sin producto la página responde 200 con «Aparejo no encontrado»: que Google
  // no la indexe como una ficha viva y vacía.
  if (!product) return { title: 'Aparejo no encontrado', robots: { index: false, follow: false } }
  const title = tituloSeo(product, titulosRepetidos(todos))
  const description = descripcionSeo(product)
  /*
   * Un id numérico que no está en el catálogo se resuelve en vivo contra la
   * tienda de origen (lo usa el asesor). Sirve para enseñarlo, pero no es una
   * ficha nuestra: sin noindex, cualquiera podría crear miles de URL indexables
   * con el texto de la tienda. Si la lista no se pudo leer, no se juzga.
   */
  const fueraDelCatalogo = todos.length > 0 && !todos.some((p) => p.id === product.id)
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/products/${product.id}` },
    ...(fueraDelCatalogo ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      type: 'website',
      images: product.images.length ? product.images.slice(0, 4).map((i) => proxiedImage(i, product.title)) : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const chip =
  'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-ink border border-ink/10 rounded-full hover:bg-ink hover:text-paper transition-colors'
const tituloSeccion = 'font-display uppercase text-2xl md:text-3xl leading-none'
const etiqueta = 'font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60'

export default async function ProductPage({ params }: Params) {
  const { id } = await params
  const product = await resolveProduct(id)

  if (!product) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-6">
          <Icon name="hook" className="w-14 h-14 mx-auto text-ink/40" strokeWidth={1.4} />
          <h1 className="font-display uppercase text-4xl text-ink">Aparejo no encontrado</h1>
          <p className="text-ink/60 text-sm max-w-sm mx-auto">El producto no existe o ha sido retirado del catálogo.</p>
          <Link href="/" className="inline-block bg-ink text-paper px-6 py-3 text-sm font-semibold border border-ink/10 rounded-full shadow-hard hover-shift">
            Volver al inicio
          </Link>
        </div>
      </Layout>
    )
  }

  const [todos, taxonomy, ranking, guias] = await Promise.all([
    listProducts(),
    getTaxonomy(),
    getTrendingProducts(8, String(product.typeFishing)).catch((): Product[] => []),
    listGuides({ publishedOnly: true }).catch(() => []),
  ])

  const categoria = String(product.typeFishing)
  const modalityLabel = categoryName(taxonomy, categoria)
  const productCategories = product.categories?.length ? product.categories : [categoria]
  const sub = subcategoriesOf(taxonomy, categoria).find((s) => s.id === product.subcategory) ?? null
  const ruta = sub ? `${modalityLabel} › ${sub.name}` : modalityLabel
  const urlFicha = `${SITE_URL}/products/${product.id}`
  const precio = precioEnTexto(product.price, product.currency)

  /* ---- El grafo de enlaces de esta ficha (lib/enlazado.ts) ---- */
  const especies = especiesDeProducto(product)
  const tecnicas = tecnicasDeProducto(product)
  const parecidos = productosParecidos(product, todos, 8)
  const complementos = complementosDe(product, todos, 3)
  const nudos = nudosDeProducto(product, 3)
  const { anterior, siguiente } = vecinosDe(product, todos)
  const puesto = ranking.findIndex((p) => p.id === product.id) + 1
  const nombreRanking = ranking.length ? tituloDeRanking(categoria) : null
  const guiasDeAqui = guias.filter((g) => g.typeFishing && productCategories.includes(g.typeFishing)).slice(0, 3)
  const enCategoria = todos.filter((p) => p.id !== product.id && (p.typeFishing === categoria || p.categories?.includes(categoria)))
  const enSub = sub ? enCategoria.filter((p) => p.subcategories?.includes(sub.id)) : []
  const alternativas = sub && enSub.length ? enSub : enCategoria
  const desde = alternativas.filter((p) => p.price > 0).reduce((m, p) => Math.min(m, p.price), Infinity)

  // Para la primera especie de mar que nombra la ficha: dónde se pesca.
  const especieConZonas = especies.find((e) => e.motivo === 'menciona' && !isFreshwater(e.especie.id))?.especie ?? null
  const zonas = especieConZonas ? zonasParaEnlazar(especieConZonas.id, product.id, 4) : []

  const snapshot = {
    id: product.id,
    title: product.title,
    price: product.price,
    currency: product.currency,
    imageUrl: proxiedImage(product.imageUrl, product.title),
  }

  const nombradas = especies.filter((e) => e.motivo === 'menciona')
  const specs: { label: string; value: string; href?: string; enlaces?: { name: string; href: string }[] }[] = [
    { label: 'Categoría', value: modalityLabel, href: `/categories/${categoria}` },
    ...(sub ? [{ label: 'Tipo', value: sub.name, href: `/categories/${categoria}/${sub.id}` }] : []),
    ...(tecnicas.length ? [{ label: 'Técnica', value: tecnicas.map((t) => t.nombre).join(', ') }] : []),
    ...(nombradas.length
      ? [{ label: 'Especies', value: '', enlaces: nombradas.map((e) => ({ name: e.especie.name, href: `/especies/${e.especie.id}` })) }]
      : []),
    ...(puesto > 0 && nombreRanking ? [{ label: 'Ranking', value: `Nº ${puesto} de ${ranking.length}`, href: `/mejores/${categoria}` }] : []),
    { label: 'Precio orientativo', value: precio },
    { label: 'Valoración media', value: `${product.rating.toFixed(1)} / 5` },
    { label: 'Unidades vendidas', value: product.reviews.toLocaleString('es-ES') },
    { label: 'Disponibilidad', value: product.inStock ? 'Disponible' : 'No disponible' },
  ]

  const nombreCorto = recortarPorPalabras(product.title, 48)
  const faqs = preguntasDeProducto({
    nombre: nombreCorto,
    ruta,
    nombradas: nombradas.map((e) => elSpecies(e.especie)),
    tecnicas: tecnicas.map((t) => ({
      nombre: t.nombre,
      especies: especies.filter((e) => e.tecnica?.id === t.id).slice(0, 3).map((e) => elSpecies(e.especie)),
    })),
    nudos,
    precio,
    alternativas: {
      cuantas: alternativas.length,
      desde: Number.isFinite(desde) ? precioEnTexto(desde, product.currency) : null,
      donde: sub && enSub.length ? `${modalityLabel} › ${sub.name}` : modalityLabel,
      ranking: nombreRanking,
    },
  })

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const trustBadges: { icon: IconName; label: string }[] = [
    { icon: 'lock', label: 'Compra 100% segura' },
    { icon: 'package', label: 'Envío con seguimiento' },
    { icon: 'rod', label: 'Seleccionado por expertos' },
    { icon: 'message', label: 'Asesor de pesca gratis' },
  ]

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: modalityLabel, url: `${SITE_URL}/categories/${categoria}` },
    ...(sub ? [{ name: sub.name, url: `${SITE_URL}/categories/${categoria}/${sub.id}` }] : []),
    { name: product.title },
  ])

  const jsonLd = productoJsonLd(product, {
    url: urlFicha,
    imagenes: product.images.map((i) => absoluteProxiedImage(i, product.title)),
    categoria: sub ? `${modalityLabel} > ${sub.name}` : modalityLabel,
    descripcion: descripcionSeo(product, 5000),
    parecidos: parecidos.slice(0, 4).map((p) => ({ name: p.title, url: `${SITE_URL}/products/${p.id}` })),
  })

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />
      <RecentTracker {...snapshot} />
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Migas de pan" className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mb-8 flex flex-wrap items-center gap-x-1 gap-y-1">
          <Link href="/" className="hover:text-accent">Inicio</Link>
          <span className="mx-1">/</span>
          <Link href={`/categories/${categoria}`} className="hover:text-accent">{modalityLabel}</Link>
          {sub && (
            <>
              <span className="mx-1">/</span>
              <Link href={`/categories/${categoria}/${sub.id}`} className="hover:text-accent">{sub.name}</Link>
            </>
          )}
          <span className="mx-1">/</span>
          <span className="text-ink truncate max-w-[16rem]">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mb-16">
          <div className="lg:col-span-5">
            <ProductGallery
              images={product.images.map((i) => proxiedImage(i, product.title))}
              alts={product.imageAlts}
              videoUrl={proxiedImage(product.videoUrl, product.title)}
              title={product.title}
            />
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/categories/${categoria}`} className="inline-flex bg-ink text-paper text-[11px] font-semibold px-3 py-1.5 st rounded-full hover:bg-accent transition-colors">
                  {modalityLabel}
                </Link>
                {product.inStock ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 st rounded-full border border-accent/40 text-accent">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Disponible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 st rounded-full border border-ink/12 text-ink/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink/40" /> No disponible
                  </span>
                )}
                {puesto > 0 && nombreRanking && (
                  <Link
                    href={`/mejores/${categoria}`}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 st rounded-full bg-accent text-paper hover:bg-ink transition-colors"
                  >
                    <Icon name="star" className="w-3 h-3" /> Nº {puesto} en {nombreRanking.charAt(0).toLowerCase() + nombreRanking.slice(1)}
                  </Link>
                )}
              </div>

              <h1 className="font-display uppercase text-4xl md:text-5xl leading-[0.95] text-ink">{product.title}</h1>

              <div className="flex items-center gap-2 font-mono text-sm">
                <Stars rating={product.rating} className="w-4 h-4" />
                <span className="font-bold text-ink">{product.rating.toFixed(1)}</span>
                <span className="text-ink/60">· {product.reviews.toLocaleString('es-ES')} vendidos</span>
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-baseline gap-2 border border-ink/10 rounded-xl shadow-hard px-5 py-3 bg-paper">
                  <span className="font-display text-5xl leading-none text-ink">{product.price.toFixed(2)}</span>
                  <span className="font-display text-2xl text-ink/60">{product.currency === 'EUR' ? '€' : product.currency}</span>
                </div>
                <p className="text-[12px] text-ink/60">
                  Precio orientativo · puede variar en la tienda del vendedor
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className={etiqueta}>Descripción</h2>
                <div
                  className="text-[15px] text-ink/80 leading-relaxed [&_strong]:text-ink [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: renderDescription(product.description) }}
                />
              </div>

              {especies.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className={etiqueta}>Ideal para:</span>
                  {especies.map((e) => (
                    <Link key={e.especie.id} href={`/especies/${e.especie.id}`} className={chip}>
                      <span aria-hidden>{e.especie.emoji}</span> {e.especie.name}
                    </Link>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className={etiqueta}>Categorías:</span>
                {productCategories.map((cat) => (
                  <Link key={cat} href={`/categories/${cat}`} className={chip}>
                    {categoryName(taxonomy, cat)}
                  </Link>
                ))}
                {sub && (
                  <Link href={`/categories/${categoria}/${sub.id}`} className={chip}>
                    {sub.name}
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-auto pt-8 space-y-3">
              {product.inStock ? (
                <a
                  href={`/go/${product.id}`}
                  target="_blank"
                  rel="noopener sponsored"
                  className="w-full flex items-center justify-center gap-2 bg-ink text-paper px-8 py-5 font-display uppercase text-2xl border border-ink/10 rounded-xl shadow-hard-md hover-shift hover:bg-accent hover:border-accent"
                >
                  Comprar ahora →
                </a>
              ) : (
                <div className="w-full flex flex-col items-center justify-center gap-1 bg-ink/5 text-ink/60 px-8 py-5 border border-ink/10 rounded-xl cursor-not-allowed">
                  <span className="font-display uppercase text-2xl leading-none">No disponible</span>
                  <span className="text-[13px]">Vuelve a consultarlo pronto</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AsesorButton
                  ask={`¿Es buena opción el/la "${product.title}"? ¿Para qué tipo de pesca lo recomiendas y cómo lo uso?`}
                  className="w-full flex items-center justify-center gap-2 bg-paper text-ink px-6 py-3.5 font-semibold text-sm border border-ink/10 rounded-full hover:bg-ink hover:text-paper transition-colors"
                >
                  <Icon name="rod" className="w-4 h-4" strokeWidth={1.8} />Preguntar
                </AsesorButton>
                <FavoriteButton product={snapshot} variant="full" className="w-full px-6 py-3.5 text-sm" />
              </div>
              <Link
                href={sub ? `/categories/${categoria}/${sub.id}` : `/categories/${categoria}`}
                className="block text-center text-xs font-semibold text-accent hover:underline"
              >
                Ver todo en {sub ? sub.name : modalityLabel} →
              </Link>
              <p className="text-[12px] text-ink/60 text-center">Compra 100% segura · Envío con seguimiento</p>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16">
          {trustBadges.map((b) => (
            <div key={b.label} className="flex items-center gap-3 border border-ink/[0.07] rounded-xl bg-paper px-4 py-3">
              <Icon name={b.icon} className="w-6 h-6 text-accent" strokeWidth={1.6} />
              <span className="text-[13px] font-semibold text-ink/75 leading-tight">{b.label}</span>
            </div>
          ))}
        </div>

        {/*
          * Para qué peces sirve. Cada tarjeta dice POR QUÉ está ahí: o la ficha
          * nombra la especie, o usa la técnica con la que se pesca.
          */}
        {especies.length > 0 && (
          <section className="mb-16 space-y-5" aria-labelledby="para-que-peces">
            <div className="flex flex-col gap-1 border-b border-ink/[0.07] pb-3">
              <h2 id="para-que-peces" className={tituloSeccion}>Para qué peces sirve</h2>
              <p className="text-sm text-ink/60">
                {nombradas.length
                  ? `Su ficha lo recomienda para ${enumerar(nombradas.map((e) => elSpecies(e.especie)))}.`
                  : `Es material de ${enumerar(tecnicas.map((t) => t.nombre))}.`}{' '}
                Cómo, cuándo y dónde pescar cada una:
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {especies.map((e) => (
                <Link
                  key={e.especie.id}
                  href={`/especies/${e.especie.id}`}
                  className="group flex flex-col bg-paper border border-ink/[0.07] rounded-xl overflow-hidden hover-shift shadow-hard"
                >
                  <div className="relative aspect-[4/3] bg-ink/[0.05]">
                    {e.especie.images[0] ? (
                      <Image
                        src={e.especie.images[0]}
                        alt={`Foto de ${e.especie.name.toLowerCase()}`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-4xl" aria-hidden>{e.especie.emoji}</span>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-sm font-bold text-ink group-hover:text-accent leading-tight">{e.especie.name}</p>
                    <p className="text-[12px] text-ink/60 leading-snug">
                      {e.motivo === 'menciona' ? 'La nombra la ficha' : `Se pesca a ${e.tecnica?.nombre}`}
                    </p>
                    {temporada(e.especie) && (
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ink/60">Temporada: {temporada(e.especie)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            {especieConZonas && zonas.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className={etiqueta}>Dónde pescar {elSpecies(especieConZonas)}:</span>
                {zonas.map((z) => (
                  <Link key={z.slug} href={`/pesca/${especieConZonas.id}/${z.slug}`} className={chip}>
                    {z.name}
                  </Link>
                ))}
                <Link href={`/especies/${especieConZonas.id}`} className="text-xs font-semibold text-accent hover:underline">
                  Todas las zonas →
                </Link>
              </div>
            )}
          </section>
        )}

        {/* Lo que se monta con esto: la siguiente pregunta de quien compra. */}
        {complementos.length > 0 && (
          <section className="mb-16 space-y-5" aria-labelledby="completa-equipo">
            <div className="flex flex-col gap-1 border-b border-ink/[0.07] pb-3">
              <h2 id="completa-equipo" className={tituloSeccion}>Completa el equipo</h2>
              <p className="text-sm text-ink/60">Lo que se monta con {modalityLabel.toLowerCase()}, elegido para que encaje.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {complementos.map((c) => (
                <div key={c.product.id} className="group relative flex gap-4 border border-ink/[0.07] rounded-xl bg-paper p-3 shadow-hard hover-shift">
                  <div className="relative w-24 h-24 flex-shrink-0 bg-ink/[0.05] border border-ink/10 rounded-lg overflow-hidden">
                    <ProductImage
                      src={proxiedImage(c.product.imageUrl, c.product.title)}
                      alt={c.product.title}
                      sizes="96px"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">{c.motivo}</span>
                    <Link href={`/products/${c.product.id}`} className="mt-1 text-sm font-semibold text-ink group-hover:text-accent leading-snug line-clamp-2 after:absolute after:inset-0">
                      {c.product.title}
                    </Link>
                    <span className="mt-auto pt-1 font-display text-xl leading-none text-ink">{precioEnTexto(c.product.price, c.product.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Details + FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 mb-16">
          <div className="space-y-4">
            <h2 className={`${tituloSeccion} border-b border-ink/[0.07] pb-3`}>Ficha técnica</h2>
            <dl className="divide-y divide-ink/10 border border-ink/[0.07] rounded-xl overflow-hidden">
              {specs.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between gap-4 px-4 py-3 bg-paper">
                  <dt className={`${etiqueta} flex-shrink-0`}>{s.label}</dt>
                  <dd className="text-sm font-semibold text-ink text-right break-words">
                    {s.enlaces ? (
                      s.enlaces.map((l, i) => (
                        <span key={l.href}>
                          {i > 0 && ', '}
                          <Link href={l.href} className="text-accent hover:underline">{l.name}</Link>
                        </span>
                      ))
                    ) : s.href ? (
                      <Link href={s.href} className="text-accent hover:underline">{s.value}</Link>
                    ) : (
                      s.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            {nudos.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className={etiqueta}>Nudos y montajes para usarlo</h3>
                <ul className="space-y-2">
                  {nudos.map((n) => (
                    <li key={n.id}>
                      <Link href={`/nudos/${n.id}`} className="group flex items-start gap-3 border border-ink/[0.07] rounded-xl bg-paper px-4 py-3 hover:border-accent/40 transition-colors">
                        <Icon name="rod" className="w-5 h-5 mt-0.5 text-accent flex-shrink-0" strokeWidth={1.6} />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-ink group-hover:text-accent">{n.name}</span>
                          <span className="block text-[13px] text-ink/70 leading-snug">{n.para}</span>
                        </span>
                        {/^[\d\s–-]+%/.test(n.resistencia) && (
                          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-ink/60 whitespace-nowrap">
                            {n.resistencia.match(/^[\d\s–-]+%/)?.[0]}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className={`${tituloSeccion} border-b border-ink/[0.07] pb-3`}>Preguntas frecuentes</h2>
            <div className="space-y-2">
              {faqs.map((f) => (
                <details key={f.q} className="group border border-ink/[0.07] rounded-xl bg-paper px-4 py-3 [&_summary]:list-none">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer text-sm font-bold text-ink">
                    {f.q}
                    <span className="flex-shrink-0 text-accent transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                  </summary>
                  <p className="text-sm text-ink/70 leading-relaxed mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        {parecidos.length > 0 && (
          <section className="space-y-6 mb-16" aria-labelledby="parecidos">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4 border-b border-ink/[0.07] pb-4">
              <h2 id="parecidos" className="font-display uppercase text-2xl sm:text-3xl md:text-4xl leading-none break-words">
                Parecidos a este
              </h2>
              <Link href={sub ? `/categories/${categoria}/${sub.id}` : `/categories/${categoria}`} className="text-xs font-semibold text-accent hover:underline whitespace-nowrap">
                Ver todo en {sub ? sub.name : modalityLabel} →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {parecidos.map((rp) => (
                <ProductCard key={rp.id} {...rp} />
              ))}
            </div>
          </section>
        )}

        {/*
          * Sigue explorando: la ficha conectada con las páginas que la ordenan
          * (categoría, tipo, ranking, guías) y con sus vecinas de categoría. Las
          * vecinas son las que garantizan que ninguna ficha queda sin enlaces.
          */}
        <section className="mb-16 space-y-5" aria-labelledby="sigue-explorando">
          <h2 id="sigue-explorando" className={`${tituloSeccion} border-b border-ink/[0.07] pb-3`}>Sigue explorando</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href={`/categories/${categoria}`} className="group border border-ink/[0.07] rounded-xl bg-paper px-4 py-4 hover:border-accent/40 transition-colors">
              <span className={etiqueta}>Categoría</span>
              <span className="block mt-1 text-sm font-bold text-ink group-hover:text-accent">Todo en {modalityLabel}</span>
              <span className="block text-[13px] text-ink/60">{enCategoria.length + 1} productos</span>
            </Link>
            {sub && (
              <Link href={`/categories/${categoria}/${sub.id}`} className="group border border-ink/[0.07] rounded-xl bg-paper px-4 py-4 hover:border-accent/40 transition-colors">
                <span className={etiqueta}>Tipo</span>
                <span className="block mt-1 text-sm font-bold text-ink group-hover:text-accent">{sub.name}</span>
                <span className="block text-[13px] text-ink/60">{enSub.length + 1} en {modalityLabel.toLowerCase()}</span>
              </Link>
            )}
            {nombreRanking && (
              <Link href={`/mejores/${categoria}`} className="group border border-ink/[0.07] rounded-xl bg-paper px-4 py-4 hover:border-accent/40 transition-colors">
                <span className={etiqueta}>Ranking</span>
                <span className="block mt-1 text-sm font-bold text-ink group-hover:text-accent">{nombreRanking}</span>
                <span className="block text-[13px] text-ink/60">{puesto > 0 ? `Este está en el puesto ${puesto}` : 'Comparativa y guía de compra'}</span>
              </Link>
            )}
            {guiasDeAqui.map((g) => (
              <Link key={g.id} href={`/guias/${g.id}`} className="group border border-ink/[0.07] rounded-xl bg-paper px-4 py-4 hover:border-accent/40 transition-colors">
                <span className={etiqueta}>Guía</span>
                <span className="block mt-1 text-sm font-bold text-ink group-hover:text-accent">{g.title}</span>
              </Link>
            ))}
            {!guiasDeAqui.length && (
              <Link href="/especies" className="group border border-ink/[0.07] rounded-xl bg-paper px-4 py-4 hover:border-accent/40 transition-colors">
                <span className={etiqueta}>Especies</span>
                <span className="block mt-1 text-sm font-bold text-ink group-hover:text-accent">Guía de especies</span>
                <span className="block text-[13px] text-ink/60">{TODAS_LAS_ESPECIES.length} fichas con temporada y técnica</span>
              </Link>
            )}
          </div>
          {(anterior || siguiente) && (
            <nav aria-label={`Más en ${modalityLabel}`} className="flex flex-col sm:flex-row gap-3">
              {anterior && (
                <Link href={`/products/${anterior.id}`} rel="prev" className="group flex-1 min-w-0 flex items-center gap-3 border border-ink/[0.07] rounded-xl bg-paper px-4 py-3 hover:border-accent/40 transition-colors">
                  <span className="text-accent text-lg" aria-hidden>←</span>
                  <span className="min-w-0">
                    <span className={etiqueta}>Anterior en {modalityLabel}</span>
                    <span className="block text-sm font-semibold text-ink group-hover:text-accent truncate">{anterior.title}</span>
                  </span>
                </Link>
              )}
              {siguiente && (
                <Link href={`/products/${siguiente.id}`} rel="next" className="group flex-1 min-w-0 flex items-center justify-end gap-3 text-right border border-ink/[0.07] rounded-xl bg-paper px-4 py-3 hover:border-accent/40 transition-colors">
                  <span className="min-w-0">
                    <span className={etiqueta}>Siguiente en {modalityLabel}</span>
                    <span className="block text-sm font-semibold text-ink group-hover:text-accent truncate">{siguiente.title}</span>
                  </span>
                  <span className="text-accent text-lg" aria-hidden>→</span>
                </Link>
              )}
            </nav>
          )}
        </section>

        <div className="mt-16">
          <RecentlyViewed excludeId={product.id} />
        </div>
      </div>
    </Layout>
  )
}
