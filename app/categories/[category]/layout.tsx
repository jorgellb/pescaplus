import type { Metadata } from 'next'
import { getFishingType } from '@/lib/fishing'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const type = getFishingType(category)
  const name = type?.name ?? 'Aparejos de pesca'
  const description =
    type?.tagline ?? `Los mejores productos de ${name} seleccionados por expertos en PescaPlus.`
  return {
    title: name,
    description,
    alternates: { canonical: `/categories/${category}` },
    openGraph: { title: `${name} · PescaPlus`, description },
  }
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
