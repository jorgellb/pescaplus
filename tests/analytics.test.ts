import { describe, it, expect } from 'vitest'
import { normalizarRuta, canalDe, esBot, dispositivoDe } from '@/lib/analytics'

/**
 * Las tres decisiones que se toman al ENTRAR el evento y ya no se pueden
 * deshacer: cómo se agrupa la página, de dónde viene y si es una persona.
 * Si esto se rompe, la analítica sigue funcionando y mintiendo, que es peor.
 */
describe('normalización de rutas', () => {
  it('agrupa por página, no por URL', () => {
    expect(normalizarRuta('/products/anzuelo-x')).toBe('/products/:id')
    expect(normalizarRuta('/especies/lubina?utm_source=x')).toBe('/especies/:especie')
    expect(normalizarRuta('/pesca/dorada/cadiz')).toBe('/pesca/:especie/:zona')
    expect(normalizarRuta('/categories/senuelos/vinilos')).toBe('/categories/:cat/:sub')
    expect(normalizarRuta('/categories/senuelos')).toBe('/categories/:cat')
  })
  it('deja las páginas fijas como están y limpia los bordes', () => {
    expect(normalizarRuta('/especies')).toBe('/especies')
    expect(normalizarRuta('/carta/')).toBe('/carta')
    expect(normalizarRuta('/aqui#mapa')).toBe('/aqui')
    expect(normalizarRuta('')).toBe('/')
    // Una URL basura no puede inflar la tabla con una fila irrepetible enorme.
    expect(normalizarRuta('/x' + 'y'.repeat(500)).length).toBeLessThanOrEqual(120)
  })
})

describe('procedencia', () => {
  const host = 'pescaplus.es'
  it('distingue los canales', () => {
    expect(canalDe('https://www.google.com/search', '/', host).canal).toBe('organico')
    expect(canalDe('https://m.facebook.com/', '/', host).canal).toBe('social')
    expect(canalDe('https://foro-pesca.com/hilo', '/', host).canal).toBe('referido')
    expect(canalDe('', '/', host).canal).toBe('directo')
  })
  it('la navegación interna no es una procedencia', () => {
    // Sin esto, cada clic dentro del sitio se contaría como una visita referida
    // por nosotros mismos y el reparto de canales quedaría inservible.
    expect(canalDe('https://pescaplus.es/especies', '/carta', host).canal).toBe('interno')
    expect(canalDe('https://www.pescaplus.es/especies', '/carta', host).canal).toBe('interno')
  })
  it('la campaña manda sobre el referrer', () => {
    const r = canalDe('https://www.google.com/', '/?utm_source=boletin', host)
    expect(r.canal).toBe('campaña')
    expect(r.ref).toBe('boletin')
  })
})

describe('bots y dispositivo', () => {
  it('descarta rastreadores y agentes vacíos', () => {
    expect(esBot('Googlebot/2.1')).toBe(true)
    expect(esBot('curl/8.0')).toBe(true)
    expect(esBot('')).toBe(true)
    expect(esBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1')).toBe(false)
  })
  it('separa móvil, tablet y escritorio', () => {
    expect(dispositivoDe('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile Safari')).toBe('movil')
    expect(dispositivoDe('Mozilla/5.0 (iPad; CPU OS 17_0) Safari')).toBe('tablet')
    expect(dispositivoDe('Mozilla/5.0 (X11; Linux x86_64) Chrome/120')).toBe('escritorio')
  })
})

describe('qué se mide y qué no', () => {
  it('el panel de administración queda fuera', async () => {
    // Se descubrió midiendo: las visitas de Jorge al panel entraban como tráfico
    // del sitio. Inflan las visitas, hunden el CTR —nadie compra desde el
    // panel— y meten rutas internas en el ranking de páginas.
    const { medible } = await import('@/components/Analitica')
    expect(medible('/admin')).toBe(false)
    expect(medible('/admin/analytics')).toBe(false)
    expect(medible('/admin/taxonomia')).toBe(false)
    expect(medible('/api/e')).toBe(false)
  })
  it('el sitio público sí se mide', async () => {
    const { medible } = await import('@/components/Analitica')
    expect(medible('/')).toBe(true)
    expect(medible('/especies/lubina')).toBe(true)
    expect(medible('/carta')).toBe(true)
    // Ojo con el prefijo suelto: una página pública que empiece por «admin»
    // sin barra no puede caer por error en la exclusión.
    expect(medible('/administracion-pesquera')).toBe(true)
  })
})
