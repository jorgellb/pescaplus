import type { Product } from '@/types'
import { fishingLabel } from '@/lib/fishing'

/**
 * Product feed builders for Google Merchant Center (RSS 2.0 XML with the g:
 * namespace) and Meta / Instagram-Facebook catalogs (CSV). Both consume the same
 * product list and are served from /api/feeds/*.
 */

const GOOGLE_CATEGORY = 'Sporting Goods > Outdoor Recreation > Fishing'

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Strip the lightweight markdown so descriptions are plain text in feeds. */
function stripMarkdown(value: string): string {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function feedProducts(products: Product[]): Product[] {
  return products.filter((p) => p.imageUrl && p.price > 0 && p.affiliateUrl)
}

function description(p: Product): string {
  return (p.seoDescription || stripMarkdown(p.description) || p.title).slice(0, 4900)
}

/** Google Merchant Center RSS 2.0 feed. */
export function buildGoogleFeed(products: Product[], siteUrl: string): string {
  const items = feedProducts(products)
    .map((p) => {
      const link = `${siteUrl}/products/${p.id}`
      const extraImages = p.images
        .slice(1, 11)
        .map((img) => `      <g:additional_image_link>${xmlEscape(img)}</g:additional_image_link>`)
        .join('\n')
      return `    <item>
      <g:id>${xmlEscape(p.id)}</g:id>
      <g:title>${xmlEscape(p.title.slice(0, 150))}</g:title>
      <g:description>${xmlEscape(description(p))}</g:description>
      <g:link>${xmlEscape(link)}</g:link>
      <g:image_link>${xmlEscape(p.imageUrl)}</g:image_link>
${extraImages ? extraImages + '\n' : ''}      <g:availability>${p.inStock ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${p.price.toFixed(2)} ${xmlEscape(p.currency)}</g:price>
      <g:condition>new</g:condition>
      <g:brand>PescaPlus</g:brand>
      <g:mpn>${xmlEscape(p.aliexpressId)}</g:mpn>
      <g:google_product_category>${xmlEscape(GOOGLE_CATEGORY)}</g:google_product_category>
      <g:product_type>${xmlEscape(fishingLabel(p.typeFishing))}</g:product_type>
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>PescaPlus — Catálogo de pesca</title>
    <link>${xmlEscape(siteUrl)}</link>
    <description>Aparejos de pesca seleccionados de AliExpress</description>
${items}
  </channel>
</rss>`
}

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
}

/** Meta (Instagram / Facebook) catalog CSV feed. */
export function buildMetaFeed(products: Product[], siteUrl: string): string {
  const header = [
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'brand',
    'product_type',
    'google_product_category',
    'additional_image_link',
  ]

  const rows = feedProducts(products).map((p) =>
    [
      p.id,
      p.title.slice(0, 150),
      description(p),
      p.inStock ? 'in stock' : 'out of stock',
      'new',
      `${p.price.toFixed(2)} ${p.currency}`,
      `${siteUrl}/products/${p.id}`,
      p.imageUrl,
      'PescaPlus',
      fishingLabel(p.typeFishing),
      GOOGLE_CATEGORY,
      p.images.slice(1, 11).join(','),
    ]
      .map((v) => csvField(String(v)))
      .join(','),
  )

  return [header.map(csvField).join(','), ...rows].join('\n')
}
