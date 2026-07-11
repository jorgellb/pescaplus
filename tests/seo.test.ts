import { describe, it, expect } from 'vitest'
import { breadcrumbJsonLd, absoluteUrl, SITE_URL } from '@/lib/seo'

describe('seo helpers', () => {
  it('absoluteUrl joins a path to the site url', () => {
    expect(absoluteUrl('/x')).toBe(`${SITE_URL}/x`)
    expect(absoluteUrl('x')).toBe(`${SITE_URL}/x`)
  })

  it('breadcrumbJsonLd builds a positioned list; the current page has no url', () => {
    const bc = breadcrumbJsonLd([{ name: 'Inicio', url: 'https://s/' }, { name: 'Actual' }])
    expect(bc['@type']).toBe('BreadcrumbList')
    expect(bc.itemListElement).toHaveLength(2)
    expect(bc.itemListElement[0].position).toBe(1)
    expect(bc.itemListElement[0].item).toBe('https://s/')
    expect(bc.itemListElement[1].position).toBe(2)
    expect(bc.itemListElement[1]).not.toHaveProperty('item')
  })
})
