import Link from 'next/link'
import Layout from '@/components/Layout'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import CategoryBrowser from './CategoryBrowser'
import { FISHING_TYPES, getFishingType } from '@/lib/fishing'
import { listProducts } from '@/lib/products-store'

type Params = { params: Promise<{ category: string }> }

// ISR: pre-render every category, refresh hourly (+ on-demand on admin edits).
export const revalidate = 3600

export function generateStaticParams() {
  return FISHING_TYPES.map((t) => ({ category: t.id }))
}

export default async function CategoryPage({ params }: Params) {
  const { category } = await params
  const fishingType = getFishingType(category)
  const categoryName = fishingType?.name ?? category
  const categoryDescription = fishingType?.tagline ?? 'Los mejores aparejos para tus salidas de pesca.'
  const products = await listProducts({ typeFishing: category })

  return (
    <Layout>
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="text-xs text-slate-400 mb-4">
            <Link href="/" className="hover:text-sky-600">Inicio</Link> <span className="mx-1">/</span>{' '}
            <span className="text-slate-600 font-medium">{categoryName}</span>
          </nav>
          <div className="flex items-center gap-4">
            {fishingType && (
              <span className={`inline-flex flex-shrink-0 text-slate-700 p-3.5 rounded-2xl bg-gradient-to-br ${fishingType.color} ring-1 ring-slate-900/5`}>
                <CategoryIcon id={fishingType.id} className="w-9 h-9" strokeWidth={1.5} />
              </span>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">{categoryName}</h1>
              <p className="text-slate-500 text-sm md:text-base mt-1 max-w-xl">{categoryDescription}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <CategoryBrowser category={category} initialProducts={products} />
      </section>
    </Layout>
  )
}
