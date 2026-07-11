/**
 * Append REAL spinning/baitcasting reels from AliExpress to the existing
 * (already-cleaned) lib/catalog-data.ts, with SEO copy by the NVIDIA agent.
 * Does NOT regenerate the whole catalog — only adds genuine reels to `carretes`.
 * Run: `node scripts/add-reels.mjs [count]`
 */
import 'dotenv/config'
import crypto from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'lib', 'catalog-data.ts')

const APP_KEY = process.env.ALIEXPRESS_APP_KEY
const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET
const TRACKING_ID = process.env.ALIEXPRESS_TRACKING_ID ?? 'pescaplus'
const GATEWAY = process.env.ALIEXPRESS_GATEWAY ?? 'https://api-sg.aliexpress.com/sync'
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1'
const DEFAULT_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  'nvidia/nemotron-3-nano-30b-a3b',
  'nvidia/nvidia-nemotron-nano-9b-v2',
  'nvidia/nemotron-mini-4b-instruct',
  'nvidia/llama-3.1-nemotron-nano-8b-v1',
]
const NVIDIA_MODELS = (process.env.NVIDIA_MODELS?.split(',').map((s) => s.trim()).filter(Boolean)) || DEFAULT_MODELS
const nvidiaOn = NVIDIA_API_KEY && NVIDIA_API_KEY !== 'your_nvidia_api_key'

const WANT = Number(process.argv[2] ?? 6)
const LABEL = 'Carretes de pesca'
const CAT_ID = 'carretes'
const KEYWORDS = ['spinning reel fishing', 'baitcasting reel', 'fishing reel metal', 'carrete de pesca spinning']

// Must look like an actual reel; must NOT be an accessory / other gear.
const REEL_RE = /\b(reel|carrete|baitcast\w*|spincast|spinning reel)\b/i
const EXCLUDE_RE = /\b(bag|case|cover|pouch|bolsa|funda|estuche|maleta|line|l[ií]nea|sedal|hilo|braid|rod|ca[nñ]a|stand|holder|soporte|mango|handle|knob|grip|spool only|spare spool|lubricant|oil|glove|guante|seat|cubierta|transductor|sticker|bearing kit|repair)\b/i

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
async function searchCategory(keyword) {
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
  if (v.startsWith('//')) return `https:${v}`
  return v.replace(/^http:/, 'https:')
}

// --- SEO (NVIDIA) ---
function cleanTitle(raw) {
  return String(raw || '')
    .replace(/[|•·‖]+.*$/g, ' ')
    .replace(/\b(hot|sale|new|free shipping|env[ií]o gratis|oferta|promoci[oó]n|20\d\d|dropship\w*)\b/gi, ' ')
    .replace(/[!¡]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}
function offlineSeo(title, label, price, currency) {
  const core = cleanTitle(title) || `Equipo de ${label}`
  const short = core.length > 52 ? core.slice(0, 52).replace(/\s\S*$/, '') : core
  return {
    title: `${short} · ${label}`.slice(0, 75),
    description: `${short} para la pesca al spinning y baitcasting. Carrete seleccionado por su relación calidad-precio y las valoraciones de pescadores reales. Envío internacional disponible desde AliExpress.`,
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
let rrIndex = 0
async function nvidiaJson(instruction) {
  const start = rrIndex++ % NVIDIA_MODELS.length
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
      if (res.ok) {
        const data = await res.json()
        const p = extractJson(data.choices?.[0]?.message?.content)
        if (p) return p
      }
    } catch { /* try next model */ } finally { clearTimeout(t) }
  }
  return null
}
async function seoFor(title, price, currency) {
  const fallback = offlineSeo(title, LABEL, price, currency)
  if (!nvidiaOn) return fallback
  const instruction = `Eres copywriter SEO de una tienda de pesca. A partir de este CARRETE de pesca de AliExpress redacta una ficha ORIGINAL en español (no copies el texto de AliExpress).
Título original (referencia): "${cleanTitle(title)}"
Categoría: Carretes de pesca (spinning/baitcasting). Precio aprox: ${price} ${currency}.
Responde SOLO con JSON: {"title": string (máx 70 chars, atractivo, deja claro que es un CARRETE, con palabras clave de pesca), "description": string (3-4 frases, beneficios y usos del carrete), "seoDescription": string (140-160 chars con llamada a la acción)}`
  const p = await nvidiaJson(instruction)
  if (!p) return fallback
  const str = (v, f) => (typeof v === 'string' && v.trim() ? v.trim() : f)
  return {
    title: str(p.title, fallback.title).slice(0, 90),
    description: str(p.description, fallback.description).slice(0, 1200),
    seoDescription: str(p.seoDescription, fallback.seoDescription).slice(0, 165),
    aiOptimized: true,
  }
}

function slugify(title) {
  const b = String(title).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
  return b || 'producto'
}

async function main() {
  if (!APP_KEY || !APP_SECRET) throw new Error('Faltan credenciales de AliExpress (ALIEXPRESS_APP_KEY/SECRET)')

  // Parse the existing (cleaned) catalog.
  const srcFile = readFileSync(OUT, 'utf8')
  const m = srcFile.match(/CatalogSeed\[\]\s*=\s*(\[[\s\S]*\])\s*$/)
  if (!m) throw new Error('No se pudo leer CATALOG_SEED del catálogo actual')
  const existing = JSON.parse(m[1])
  const usedIds = new Set(existing.map((p) => p.id))
  const usedAli = new Set(existing.map((p) => String(p.aliexpressId)))
  console.log(`Catálogo actual: ${existing.length} productos · carretes: ${existing.filter((p) => p.typeFishing === 'carretes').length}`)

  // Gather reel candidates across several keywords.
  const seen = new Set()
  const candidates = []
  for (const kw of KEYWORDS) {
    process.stdout.write(`\n[buscar] "${kw}"… `)
    let raw = []
    try { raw = await searchCategory(kw) } catch (e) { process.stdout.write(`error: ${e.message}`); continue }
    for (const p of raw) {
      const id = String(p.product_id ?? '')
      const title = String(p.product_title ?? '')
      const price = Number(p.target_sale_price ?? 0)
      if (!id || seen.has(id) || usedAli.has(id)) continue
      if (!p.product_main_image_url || !(p.promotion_link || p.product_detail_url)) continue
      if (price < 3 || price > 200) continue
      if (!REEL_RE.test(title) || EXCLUDE_RE.test(title)) continue
      seen.add(id)
      candidates.push(p)
    }
    process.stdout.write(`acum ${candidates.length} carretes válidos`)
  }

  // Best sellers first.
  candidates.sort((a, b) => (Number(b.lastest_volume ?? 0)) - (Number(a.lastest_volume ?? 0)))
  const picked = candidates.slice(0, WANT)
  console.log(`\n\nSeleccionados ${picked.length}/${WANT} carretes nuevos. Generando SEO…`)

  const added = []
  for (const p of picked) {
    const price = Number(p.target_sale_price ?? 0)
    const currency = p.target_sale_price_currency ?? 'EUR'
    const seo = await seoFor(p.product_title, price, currency)
    let id = slugify(seo.title)
    let n = 2
    while (usedIds.has(id)) id = `${slugify(seo.title)}-${n++}`
    usedIds.add(id)
    const rate = parseFloat(String(p.evaluate_rate || '').replace('%', ''))
    added.push({
      id,
      sku: String(p.product_id),
      title: seo.title,
      description: seo.description,
      imageUrl: p.product_main_image_url,
      images: images(p),
      videoUrl: video(p),
      price,
      currency,
      affiliateUrl: p.promotion_link || p.product_detail_url,
      category: 'fishing',
      typeFishing: 'carretes',
      rating: Number.isFinite(rate) ? Math.min(Math.round((rate / 20) * 10) / 10, 5) : 0,
      reviews: p.lastest_volume ?? 0,
      inStock: true,
      seoDescription: seo.seoDescription,
      aiOptimized: seo.aiOptimized,
    })
    console.log(`  + ${seo.title}  (${price} ${currency}, ${p.lastest_volume ?? 0} vendidos)${seo.aiOptimized ? '' : ' [offline]'}`)
  }

  if (added.length === 0) {
    console.log('\n⚠️  No se añadió ningún carrete (sin candidatos válidos). Catálogo sin cambios.')
    return
  }

  const merged = [...existing, ...added]
  const header = `import type { CatalogSeed } from '@/lib/catalog'

// Generated by scripts/gen-catalog.mjs from real AliExpress products + NVIDIA SEO.
// Reels added by scripts/add-reels.mjs at ${new Date().toISOString()}.
export const CATALOG_SEED: CatalogSeed[] = ${JSON.stringify(merged, null, 2)}
`
  writeFileSync(OUT, header)
  console.log(`\n✅ ${added.length} carretes añadidos. Catálogo: ${merged.length} productos · carretes: ${merged.filter((p) => p.typeFishing === 'carretes').length}`)
}

main().catch((e) => { console.error('\n❌', e.message); process.exit(1) })
