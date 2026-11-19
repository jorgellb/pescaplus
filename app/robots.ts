import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://pescaplus.es'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/go/'],
    },
    // Las fichas van en un sitemap aparte para que Search Console las cuente
    // por separado (lib/sitemap-productos.ts).
    sitemap: [`${base}/sitemap.xml`, `${base}/products/sitemap.xml`],
  }
}
