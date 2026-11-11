import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import type { Product } from '@/types'

/*
 * El refresco semanal y los enlaces de compra.
 *
 * Lo que se protege: un enlace pegado a mano desde el portal de afiliados no se
 * pisa nunca, y los enlaces largos que da la API (`/s/…`, sin la clave `sk`)
 * pasan a los cortos de `link.generate` (`/e/_…`), que son los mismos que
 * genera el portal.
 */

const LARGO = 'https://s.click.aliexpress.com/s/pyFri10M6ltAv61YZY9Tfrx?aff_platform=api-new-product-detail&sk=&aff_fsk='
const MANUAL = 'https://s.click.aliexpress.com/e/_manual01'

const catalogo: Product[] = []
const escritos: { id: string; cambios: Partial<Product> }[] = []

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/products-store', () => ({
  listProducts: vi.fn(async () => catalogo),
  updateProduct: vi.fn(async (id: string, cambios: Partial<Product>) => {
    escritos.push({ id, cambios })
  }),
}))

const producto = (sku: string, affiliateUrl: string, price = 10): Product =>
  ({ id: `p-${sku}`, sku, title: sku, affiliateUrl, price, currency: 'EUR', rating: 4, reviews: 3, inStock: true, typeFishing: 'spinning' }) as Product

/** Respuesta de la API: precio y enlace largo por producto; `link.generate` opcionalmente roto. */
function apiFalsa(precios: Record<string, number>, { generadorRoto = false } = {}) {
  return vi.fn(async (entrada: string | URL | Request) => {
    const url = new URL(String(entrada))
    const metodo = url.searchParams.get('method')
    if (metodo === 'aliexpress.affiliate.productdetail.get') {
      const ids = url.searchParams.get('product_ids')!.split(',')
      const product = ids.map((id) => ({ product_id: id, product_title: id, target_sale_price: String(precios[id]), promotion_link: LARGO + id }))
      return Response.json({ aliexpress_affiliate_productdetail_get_response: { resp_result: { resp_code: 200, result: { products: { product } } } } })
    }
    if (metodo === 'aliexpress.affiliate.link.generate') {
      if (generadorRoto) return new Response('fallo', { status: 500 })
      const fuentes = url.searchParams.get('source_values')!.split(',')
      // A propósito en otro orden: la API no respeta el de la petición.
      const promotion_link = fuentes.reverse().map((source_value) => ({
        source_value,
        promotion_link: `https://s.click.aliexpress.com/e/_corto${source_value.match(/item\/(\d+)/)![1]}`,
      }))
      return Response.json({ aliexpress_affiliate_link_generate_response: { resp_result: { resp_code: 200, result: { promotion_links: { promotion_link } } } } })
    }
    throw new Error(`método inesperado ${metodo}`)
  })
}

async function refrescar(fetchFalso: ReturnType<typeof apiFalsa>) {
  vi.stubEnv('ALIEXPRESS_APP_KEY', 'clave')
  vi.stubEnv('ALIEXPRESS_APP_SECRET', 'secreto')
  vi.stubGlobal('fetch', fetchFalso)
  vi.resetModules()
  const { refreshCatalogPrices } = await import('@/lib/refresh')
  return refreshCatalogPrices()
}

const escritoDe = (sku: string) => escritos.find((e) => e.id === `p-${sku}`)?.cambios

beforeEach(() => {
  catalogo.length = 0
  escritos.length = 0
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('esEnlaceReemplazable', () => {
  it('solo se cambian los enlaces que da la API o una ficha sin afiliar', async () => {
    const { esEnlaceReemplazable } = await import('@/lib/aliexpress')
    expect(esEnlaceReemplazable('')).toBe(true)
    expect(esEnlaceReemplazable(LARGO)).toBe(true)
    expect(esEnlaceReemplazable('https://es.aliexpress.com/item/1005006732796033.html')).toBe(true)

    expect(esEnlaceReemplazable(MANUAL)).toBe(false)
    expect(esEnlaceReemplazable('https://es.aliexpress.com/item/1005006732796033.html?aff_fcid=abc&sk=_x')).toBe(false)
    expect(esEnlaceReemplazable('https://otra-tienda.es/producto')).toBe(false)
  })
})

describe('refreshCatalogPrices y los enlaces', () => {
  it('pasa los enlaces largos de la API a enlaces cortos', async () => {
    catalogo.push(producto('111', LARGO + '111'), producto('222', LARGO + '222'))
    const r = await refrescar(apiFalsa({ 111: 10, 222: 10 }))

    expect(escritoDe('111')?.affiliateUrl).toBe('https://s.click.aliexpress.com/e/_corto111')
    expect(escritoDe('222')?.affiliateUrl).toBe('https://s.click.aliexpress.com/e/_corto222')
    expect(r).toMatchObject({ checked: 2, updated: 2, shortened: 2 })
  })

  it('nunca pisa un enlace pegado a mano', async () => {
    catalogo.push(producto('333', MANUAL, 10))
    const r = await refrescar(apiFalsa({ 333: 10 }))

    expect(escritos).toEqual([])
    expect(r).toMatchObject({ updated: 0, shortened: 0 })
  })

  it('si cambia el precio, lo actualiza y conserva el enlace manual', async () => {
    catalogo.push(producto('444', MANUAL, 10))
    await refrescar(apiFalsa({ 444: 12.5 }))

    expect(escritoDe('444')).toMatchObject({ price: 12.5, affiliateUrl: MANUAL })
  })

  it('si falla el generador, se queda con el enlace de la API como hasta ahora', async () => {
    catalogo.push(producto('555', ''))
    const r = await refrescar(apiFalsa({ 555: 10 }, { generadorRoto: true }))

    expect(escritoDe('555')?.affiliateUrl).toBe(LARGO + '555')
    expect(r).toMatchObject({ updated: 1, shortened: 0 })
  })

  it('no pide enlaces cortos para lo que ya tiene uno', async () => {
    catalogo.push(producto('666', MANUAL))
    const fetchFalso = apiFalsa({ 666: 10 })
    await refrescar(fetchFalso)

    const metodos = fetchFalso.mock.calls.map(([u]) => new URL(String(u)).searchParams.get('method'))
    expect(metodos).not.toContain('aliexpress.affiliate.link.generate')
  })
})
