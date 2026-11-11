import { describe, it, expect } from 'vitest'
import { decidirSalida, senalesDe, origenDeLaSalida, paginaPuente, type SenalesSalida } from '@/lib/salida-tienda'

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'

const senales = (s: Partial<SenalesSalida> = {}): SenalesSalida => ({
  ua: CHROME,
  secFetchSite: '',
  secFetchMode: '',
  secPurpose: '',
  confirmada: false,
  ...s,
})

describe('decidirSalida: quién pasa directo a la tienda', () => {
  it('una persona que pulsa Comprar en una página de la web va directa', () => {
    expect(decidirSalida(senales({ secFetchSite: 'same-origin', secFetchMode: 'navigate' }))).toBe('tienda')
  })

  it('un programa que pide el enlace por su cuenta (sin cabeceras de navegador) va al puente', () => {
    expect(decidirSalida(senales())).toBe('puente')
  })

  it('pegar el enlace o llegar desde otra web va al puente', () => {
    expect(decidirSalida(senales({ secFetchSite: 'none', secFetchMode: 'navigate' }))).toBe('puente')
    expect(decidirSalida(senales({ secFetchSite: 'cross-site', secFetchMode: 'navigate' }))).toBe('puente')
  })

  it('una precarga del navegador no es un clic: recibe el puente, que salta cuando la persona pulsa', () => {
    expect(decidirSalida(senales({ secFetchSite: 'same-origin', secFetchMode: 'navigate', secPurpose: 'prefetch' }))).toBe('puente')
  })

  it('un bot que se identifica como tal se para, sin script que ejecutar', () => {
    const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    expect(decidirSalida(senales({ ua, secFetchSite: 'same-origin', secFetchMode: 'navigate' }))).toBe('parada')
    expect(decidirSalida(senales({ ua, confirmada: true }))).toBe('parada')
    // Chrome sin ventana ejecuta el script: con el puente entraba en bucle.
    expect(decidirSalida(senales({ ua: 'Mozilla/5.0 HeadlessChrome/141.0', confirmada: true }))).toBe('parada')
  })

  it('el salto que da el puente (con JavaScript) pasa, también en navegadores antiguos sin cabeceras', () => {
    expect(decidirSalida(senales({ confirmada: true, secFetchSite: 'same-origin' }))).toBe('tienda')
    expect(decidirSalida(senales({ confirmada: true }))).toBe('tienda')
  })

  it('el salto confirmado no vale si viene de fuera de la web, y nunca vuelve al puente', () => {
    expect(decidirSalida(senales({ confirmada: true, secFetchSite: 'cross-site' }))).toBe('parada')
    expect(decidirSalida(senales({ confirmada: true, secFetchSite: 'none' }))).toBe('parada')
    expect(decidirSalida(senales({ confirmada: true, secFetchSite: 'same-origin', secPurpose: 'prefetch;prerender' }))).toBe('parada')
  })
})

describe('senalesDe', () => {
  it('lee las cabeceras del navegador y la marca del puente', () => {
    const h = new Headers({
      'user-agent': CHROME,
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'navigate',
      'sec-purpose': 'prefetch;prerender',
    })
    expect(senalesDe(h, new URL('https://pescaplus.es/go/123?vale=1'))).toEqual({
      ua: CHROME,
      secFetchSite: 'same-origin',
      secFetchMode: 'navigate',
      secPurpose: 'prefetch;prerender',
      confirmada: true,
    })
  })

  it('acepta la cabecera antigua Purpose y sin marca no hay confirmación', () => {
    const s = senalesDe(new Headers({ purpose: 'prefetch' }), new URL('https://pescaplus.es/go/123'))
    expect(s.secPurpose).toBe('prefetch')
    expect(s.confirmada).toBe(false)
  })
})

describe('origenDeLaSalida: qué página produjo el clic', () => {
  it('sale del Referer cuando se pulsa directo', () => {
    expect(origenDeLaSalida(new URL('https://pescaplus.es/go/1'), 'https://pescaplus.es/mejores/carretes?x=1')).toBe('/mejores/carretes')
  })

  it('tras el puente, la página la trae el propio enlace', () => {
    const url = new URL('https://pescaplus.es/go/1?vale=1&desde=%2Fproducts%2Fabc')
    expect(origenDeLaSalida(url, 'https://pescaplus.es/go/1')).toBe('/products/abc')
  })

  it('el propio puente no es una página de origen', () => {
    expect(origenDeLaSalida(new URL('https://pescaplus.es/go/1?vale=1&desde=%2Fgo%2F1'), '')).toBe('')
  })

  it('no se fía de un origen raro', () => {
    expect(origenDeLaSalida(new URL('https://pescaplus.es/go/1?vale=1&desde=%2F%2Fmalo.com'), '')).toBe('')
    expect(origenDeLaSalida(new URL('https://pescaplus.es/go/1?vale=1&desde=http%3A%2F%2Fx'), '')).toBe('')
    expect(origenDeLaSalida(new URL('https://pescaplus.es/go/1'), 'no es una url')).toBe('')
  })
})

describe('paginaPuente', () => {
  const html = paginaPuente('1005006732796033')

  it('salta sola con JavaScript, sin dejar un enlace que un rastreador pueda seguir', () => {
    expect(html).toContain('location.replace')
    expect(html).not.toMatch(/href="[^"]*\/go\//)
    expect(html).not.toMatch(/vale=1/)
  })

  it('no dice el nombre de la tienda ni se indexa', () => {
    expect(html.toLowerCase()).not.toContain('aliexpress')
    expect(html).toContain('noindex')
  })

  it('quien no tiene JavaScript puede volver a la ficha', () => {
    expect(html).toContain('href="/products/1005006732796033"')
  })

  it('espera a que la persona abra la página si el navegador solo la está precargando', () => {
    expect(html).toContain('prerenderingchange')
  })

  it('no toma el propio puente como página de origen', () => {
    expect(html).toContain("'/go/'")
  })

  it('la parada no salta: así no hay bucle posible', () => {
    const parada = paginaPuente('123', false)
    expect(parada).not.toContain('<script')
    expect(parada).toContain('href="/products/123"')
  })

  it('escapa el id', () => {
    expect(paginaPuente('"><script>x</script>')).not.toContain('<script>x</script>')
  })
})
