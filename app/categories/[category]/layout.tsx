import type { Metadata } from 'next'
import { getFishingType } from '@/lib/fishing'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const type = getFishingType(category)

  /**
   * Categoría inventada: `noindex`.
   *
   * La página llama a `notFound()`, pero Next la sirve con HTTP 200 —medido en
   * la PRIMERA petición, no es un efecto de la caché—, así que para Google sería
   * una página viva y vacía. La alternativa era `dynamicParams = false`, que sí
   * da un 404 de verdad pero tumbaba TODAS las categorías cada 5 minutos (ver el
   * comentario en page.tsx). Entre un soft 404 en URLs que nadie enlaza y la
   * tienda caída, la elección no tiene discusión; el `noindex` cubre el hueco.
   */
  if (!type) {
    return { title: 'Categoría no encontrada', robots: { index: false, follow: false } }
  }

  const name = type.name
  const description = type.tagline ?? `Los mejores productos de ${name} seleccionados por expertos en PescaPlus.`
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
