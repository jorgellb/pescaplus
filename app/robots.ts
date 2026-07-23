import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://pescaplus.es'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/go/'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
