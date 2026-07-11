/**
 * Reinforce thin categories / empty subcategories by APPENDING real AliExpress
 * products (with NVIDIA SEO) to the existing lib/catalog-data.ts. Targets are
 * defined in PLAN below: [category, subcategory, searchKeyword, count, preferRe?].
 * Does not touch existing products. Run: `node scripts/reinforce-categories.mjs`
 */
import 'dotenv/config'
import crypto from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'catalog-data.ts')

const APP_KEY = process.env.ALIEXPRESS_APP_KEY
const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET
const TRACKING_ID = process.env.ALIEXPRESS_TRACKING_ID ?? 'pescaplus'
const GATEWAY = process.env.ALIEXPRESS_GATEWAY ?? 'https://api-sg.aliexpress.com/sync'
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1'
const NVIDIA_MODELS = (process.env.NVIDIA_MODELS?.split(',').map((s) => s.trim()).filter(Boolean)) || [
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  'nvidia/nemotron-3-nano-30b-a3b',
  'nvidia/nvidia-nemotron-nano-9b-v2',
  'nvidia/nemotron-mini-4b-instruct',
  'nvidia/llama-3.1-nemotron-nano-8b-v1',
]
const nvidiaOn = NVIDIA_API_KEY && NVIDIA_API_KEY !== 'your_nvidia_api_key'

// [category, subcategory, keyword, count, preferRegexSource?]
const PLAN = [
  ['lineas', 'monofilamento', 'monofilament fishing line nylon', 3, 'mono|nylon'],
  ['lineas', 'fluorocarbono', 'fluorocarbon fishing line leader', 2, 'fluoro'],
  ['anzuelos', 'triples', 'treble hooks fishing', 2, 'treble|triple'],
  ['anzuelos', 'montaje', 'carp fishing hooks hair rig', 2, 'carp|rig|barbless'],
  ['anzuelos', 'simples', 'circle fishing hooks high carbon', 1, 'circle|barbed|single'],
  ['embarcaciones', 'floattube', 'float tube fishing belly boat', 2, 'float tube|belly'],
  ['embarcaciones', 'kayaks', 'inflatable fishing boat kayak', 2, 'kayak|inflatable|boat'],
]

const CAT = {
  lineas: {
    label: 'Líneas de pesca', min: 2, max: 90,
    include: /\b(line|l[ií]nea|hilo|sedal|leader|tippet|braid|mono|fluoro|nylon)\b/i,
    exclude: /reel|carrete|\brod\b|ca[nñ]a|hook|anzuelo|\blure\b|se[nñ]uelo|\bbag\b|bolsa|plier|alicate|scissor|tijera/i,
  },
  anzuelos: {
    label: 'Anzuelos', min: 1.5, max: 45,
    include: /\b(hook|hooks|anzuelo|anzuelos|treble|circle|jig hook)\b/i,
    exclude: /reel|carrete|\brod\b|ca[nñ]a|\bline\b|l[ií]nea|\bhilo\b|\bbag\b|bolsa|lure set|plier|alicate/i,
  },
  embarcaciones: {
    label: 'Embarcaciones', min: 8, max: 650,
    include: /\b(float tube|belly boat|kayak|inflatable|boat|dinghy|raft|bote|barca|pontoon)\b/i,
    exclude: /reel|carrete|\brod\b|\bhook\b|anzuelo|\blure\b|\bline\b|l[ií]nea|phone|tel[eé]fono/i,
  },
}

// --- AliExpress ---
function sign(params, secret) {
  const base = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('')
  return crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex').toUpperCase()
}
async function aliCall(method, business) {
  const params = { method, app_key: APP_KEY, sign_method: 'sha256', timestamp: Date.now().toString(), format: 'json', v: '2.0', ...business }
  params.sign = sign(params, APP_SECRET)
  const res = await fetch(`${GATEWAY}?${new URLSearchParams(params)}`, { method: 'POST', headers: { Accept: 'application/json' } })
  const json = await res.json()
  return json[`${method.replace(/\./g, '_')}_response`] ?? json
}
async function search(keyword) {
  const data = await aliCall('aliexpress.affiliate.product.query', {
    keywords: keyword, page_no: '1', page_size: '40', sort: 'LAST_VOLUME_DESC',
    target_currency: 'EUR', target_language: 'ES', tracking_id: TRACKING_ID,
  })
  return data?.resp_result?.result?.products?.product ?? []
}
function images(raw) {
  const main = raw.product_main_image_url ? [raw.product_main_image_url] : []
  const gallery = raw.product_small_image_urls?.string ?? []
  return [...new Set([...main, ...gallery].filter(Boolean))].slice(0, 6)
}
function video(raw) {
  const v = (raw.product_video_url || '').trim()
  if (!v) return ''
  return v.startsWith('//') ? `https:${v}` : v.replace(/^http:/, 'https:')
}

// --- SEO ---
function cleanTitle(raw) {
  return String(raw || '').replace(/[|•·‖]+.*$/g, ' ')
    .replace(/\b(hot|sale|new|free shipping|env[ií]o gratis|oferta|promoci[oó]n|20\d\d|dropship\w*)\b/gi, ' ')
    .replace(/[!¡]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}
function offlineSeo(title, label, price, currency) {
  const core = cleanTitle(title) || `Equipo de ${label}`
  const short = core.length > 52 ? core.slice(0, 52).replace(/\s\S*$/, '') : core
  return {
    title: `${short} · ${label}`.slice(0, 75),
    description: `${short} para la pesca. Producto seleccionado por su relación calidad-precio y las valoraciones de compradores reales. Envío internacional disponible desde AliExpress.`,
    seoDescription: `${short} para ${label}. Comprar al mejor precio${price ? ` desde ${Number(price).toFixed(2)} ${currency}` : ''} con envío rápido. Guía en PescaPlus.`.slice(0, 160),
    aiOptimized: false,
  }
}
function extractJson(text) {
  const c = String(text || '').replace(/```json/gi, '').replace(/```/g, '')
  const s = c.indexOf('{'), e = c.lastIndexOf('}')
  if (s === -1 || e <= s) return null
  try { return JSON.parse(c.slice(s, e + 1)) } catch { return null }
}
let rr = 0
async function nvidiaJson(instruction) {
  const start = rr++ % NVIDIA_MODELS.length
  const chain = NVIDIA_MODELS.map((_, i) => NVIDIA_MODELS[(start + i) % NVIDIA_MODELS.length])
  for (const model of chain) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    try {
      const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST', signal: ctrl.signal,
        headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [
          { role: 'system', content: 'Redactas fichas SEO en español y respondes solo con JSON válido.' },
          { role: 'user', content: instruction },
        ], max_tokens: 700, temperature: 0.7, top_p: 0.9 }),
      })
      if (res.ok) { const d = await res.json(); const p = extractJson(d.choices?.[0]?.message?.content); if (p) return p }
    } catch { /* next */ } finally { clearTimeout(t) }
  }
  return null
}
async function seoFor(title, label, price, currency) {
  const fallback = offlineSeo(title, label, price, currency)
  if (!nvidiaOn) return fallback
  const p = await nvidiaJson(`Eres copywriter SEO de una tienda de pesca. A partir de este producto de AliExpress redacta una ficha ORIGINAL en español (no copies el texto de AliExpress).
Título original (referencia): "${cleanTitle(title)}"
Categoría: ${label}. Precio aprox: ${price} ${currency}.
Responde SOLO con JSON: {"title": string (máx 70 chars, atractivo, con palabras clave de pesca y el tipo de producto claro), "description": string (3-4 frases, beneficios y usos), "seoDescription": string (140-160 chars con llamada a la acción)}`)
  if (!p) return fallback
  const str = (v, f) => (typeof v === 'string' && v.trim() ? v.trim() : f)
  return {
    title: str(p.title, fallback.title).slice(0, 90),
    description: str(p.description, fallback.description).slice(0, 1200),
    seoDescription: str(p.seoDescription, fallback.seoDescription).slice(0, 165),
    aiOptimized: true,
  }
}
function slugify(t) {
  const b = String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
  return b || 'producto'
}

async function main() {
  if (!APP_KEY || !APP_SECRET) throw new Error('Faltan credenciales de AliExpress')
  const src = readFileSync(OUT, 'utf8')
  const m = src.match(/CatalogSeed\[\]\s*=\s*(\[[\s\S]*\])\s*$/)
  if (!m) throw new Error('No se pudo leer CATALOG_SEED')
  const existing = JSON.parse(m[1])
  const usedIds = new Set(existing.map((p) => p.id))
  const usedAli = new Set(existing.map((p) => String(p.aliexpressId)))

  const added = []
  for (const [category, sub, keyword, count, preferSrc] of PLAN) {
    const cfg = CAT[category]
    const prefer = preferSrc ? new RegExp(preferSrc, 'i') : null
    process.stdout.write(`\n[${category}/${sub}] "${keyword}"… `)
    let raw = []
    try { raw = await search(keyword) } catch (e) { process.stdout.write(`error: ${e.message}`); continue }
    const cand = raw.filter((p) => {
      const id = String(p.product_id ?? ''); const title = String(p.product_title ?? '')
      const price = Number(p.target_sale_price ?? 0)
      if (!id || usedAli.has(id)) return false
      if (!p.product_main_image_url || !(p.promotion_link || p.product_detail_url)) return false
      if (price < cfg.min || price > cfg.max) return false
      return cfg.include.test(title) && !cfg.exclude.test(title)
    })
    // Prefer titles matching the target subcategory, then best sellers.
    cand.sort((a, b) => {
      const pa = prefer && prefer.test(a.product_title) ? 1 : 0
      const pb = prefer && prefer.test(b.product_title) ? 1 : 0
      if (pa !== pb) return pb - pa
      return Number(b.lastest_volume ?? 0) - Number(a.lastest_volume ?? 0)
    })
    const picked = cand.slice(0, count)
    picked.forEach((p) => usedAli.add(String(p.product_id)))
    process.stdout.write(`${picked.length}/${count}`)

    for (const p of picked) {
      const price = Number(p.target_sale_price ?? 0)
      const currency = p.target_sale_price_currency ?? 'EUR'
      const seo = await seoFor(p.product_title, cfg.label, price, currency)
      let id = slugify(seo.title); let n = 2
      while (usedIds.has(id)) id = `${slugify(seo.title)}-${n++}`
      usedIds.add(id)
      const rate = parseFloat(String(p.evaluate_rate || '').replace('%', ''))
      added.push({
        id, aliexpressId: String(p.product_id), title: seo.title, description: seo.description,
        imageUrl: p.product_main_image_url, images: images(p), videoUrl: video(p), price, currency,
        affiliateUrl: p.promotion_link || p.product_detail_url, category: 'fishing',
        typeFishing: category, subcategory: sub,
        rating: Number.isFinite(rate) ? Math.min(Math.round((rate / 20) * 10) / 10, 5) : 0,
        reviews: p.lastest_volume ?? 0, inStock: true, seoDescription: seo.seoDescription, aiOptimized: seo.aiOptimized,
      })
      console.log(`\n   + [${category}/${sub}] ${seo.title.slice(0, 58)} (${price} ${currency})`)
    }
  }

  if (added.length === 0) { console.log('\n⚠️  Nada añadido.'); return }
  const merged = [...existing, ...added]
  writeFileSync(OUT, `import type { CatalogSeed } from '@/lib/catalog'

// Generated by scripts/gen-catalog.mjs from real AliExpress products + NVIDIA SEO.
// Reinforced by scripts/reinforce-categories.mjs at ${new Date().toISOString()}.
export const CATALOG_SEED: CatalogSeed[] = ${JSON.stringify(merged, null, 2)}
`)
  const dist = {}
  for (const p of merged) (dist[p.typeFishing] ??= {}), (dist[p.typeFishing][p.subcategory] = (dist[p.typeFishing][p.subcategory] ?? 0) + 1)
  console.log(`\n\n✅ ${added.length} productos añadidos. Total: ${merged.length}`)
  for (const c of ['lineas', 'anzuelos', 'embarcaciones']) console.log(`   ${c}:`, JSON.stringify(dist[c]))
}

main().catch((e) => { console.error('\n❌', e.message); process.exit(1) })
