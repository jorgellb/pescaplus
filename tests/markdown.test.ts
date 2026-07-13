import { describe, it, expect } from 'vitest'
import { renderDescription } from '@/lib/markdown'

describe('renderDescription', () => {
  it('returns empty string for blank input', () => {
    expect(renderDescription('')).toBe('')
    expect(renderDescription('   ')).toBe('')
  })

  it('escapes HTML to prevent XSS', () => {
    const html = renderDescription('<img src=x onerror=alert(1)> <script>bad()</script>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;img')
    expect(html).toContain('&lt;script&gt;')
  })

  it('renders bold and italic', () => {
    const html = renderDescription('Texto **negrita** y _cursiva_')
    expect(html).toContain('<strong>negrita</strong>')
    expect(html).toContain('<em>cursiva</em>')
  })

  it('renders valid https links with nofollow sponsored', () => {
    const html = renderDescription('Ver [guía](https://pescaplus.com/g)')
    expect(html).toContain('href="https://pescaplus.com/g"')
    expect(html).toContain('rel="nofollow noopener sponsored"')
    expect(html).toContain('>guía</a>')
  })

  it('renders internal (relative) links as followed, same-tab links for SEO equity', () => {
    const html = renderDescription('Explora nuestros [carretes de spinning](/categories/carretes)')
    expect(html).toContain('href="/categories/carretes"')
    expect(html).toContain('>carretes de spinning</a>')
    // Internal links must NOT be nofollow/sponsored nor open in a new tab.
    expect(html).not.toContain('nofollow')
    expect(html).not.toContain('sponsored')
    expect(html).not.toContain('target="_blank"')
  })

  it('rejects non-http link schemes (no anchor emitted)', () => {
    const html = renderDescription('[x](javascript:alert)')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('javascript:')
  })

  it('renders images with alt and a valid src', () => {
    const html = renderDescription('![Un carrete](https://img/x.jpg)')
    expect(html).toContain('<img src="https://img/x.jpg"')
    expect(html).toContain('alt="Un carrete"')
    expect(html).toContain('loading="lazy"')
  })

  it('rejects images with unsafe src', () => {
    const html = renderDescription('![x](javascript:alert)')
    expect(html).not.toContain('<img')
  })

  it('renders bullet lists', () => {
    const html = renderDescription('- uno\n- dos')
    expect(html).toContain('<ul')
    expect(html).toContain('<li>uno</li>')
    expect(html).toContain('<li>dos</li>')
  })

  it('wraps plain paragraphs', () => {
    const html = renderDescription('Una frase.\n\nOtra frase.')
    expect(html.match(/<p/g)?.length).toBe(2)
  })
})
