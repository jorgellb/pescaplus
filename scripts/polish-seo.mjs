/**
 * Bulk SEO polish for every product in lib/catalog-data.ts using the NVIDIA agent:
 * cleans the title (strips marketplace seller/brand names) and rewrites an
 * SEO-optimised title, meta title, description and meta description.
 *
 *   node scripts/polish-seo.mjs                 # dry-run: shows before → after
 *   node scripts/polish-seo.mjs --limit 5       # only the first 5 (testing)
 *   node scripts/polish-seo.mjs --write          # apply to catalog-data.ts + reseed
 *
 * Nothing is changed without --write. Products that fail to polish keep their
 * original copy.
 */
import 'dotenv/config'
import { readFileSync, writeFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'lib', 'catalog-data.ts')
const WRITE = process.argv.includes('--write')
const limitArg = process.argv.indexOf('--limit')
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity

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

const LABELS = {
  anzuelos: 'Anzuelos', lineas: 'Líneas de pesca', senuelos: 'Señuelos', canas: 'Cañas de pesca',
  carretes: 'Carretes de pesca', electronica: 'Electrónica', embarcaciones: 'Embarcaciones',
  minuteria: 'Minutería', plomos: 'Plomos', herramientas: 'Herramientas', equipo: 'Equipo de pesca',
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
    const t = setTimeout(() => ctrl.abort(), 20000)
    try {
      const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST', signal: ctrl.signal,
        headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [
          { role: 'system', content: 'Eres un experto SEO que pule fichas de producto en español y respondes solo con JSON válido.' },
          { role: 'user', content: instruction },
        ], max_tokens: 900, temperature: 0.6, top_p: 0.9 }),
      })
      if (res.ok) { const d = await res.json(); const p = extractJson(d.choices?.[0]?.message?.content); if (p) return p }
    } catch { /* next model */ } finally { clearTimeout(t) }
  }
  return null
}

function promptFor(p) {
  return `Eres un especialista en SEO para una tienda de pesca online en España. Revisa y PULE esta ficha de producto.

FICHA ACTUAL:
- Título: ${p.title}
- Descripción: ${p.description}
- Categoría: ${LABELS[p.typeFishing] ?? p.typeFishing}

TAREAS:
1. TÍTULO: ELIMINA nombres de marca o de vendedor propios de marketplaces (p. ej. DEUKIO, Sougayilang, Zukibo, Lixada, Noeby, DNDYUJU, Rooblinos, SEASIR, JOSBY, Proberos, Hirisi, Anatono…) y códigos internos raros. Deja un título limpio, natural y optimizado para SEO que describa el producto (tipo + característica/medida clave + uso), en español, MÁXIMO 65 caracteres, sin mayúsculas gritonas.
2. DESCRIPCIÓN: descripción PERFECTA para SEO: 3-5 frases con beneficios, usos y palabras clave naturales de pesca. Puedes usar **negrita**.
3. seoTitle: meta título de ~60 caracteres con la palabra clave principal.
4. seoDescription: meta descripción de 140-160 caracteres con llamada a la acción.

No menciones AliExpress ni ningún marketplace, ni marcas de vendedor, ni que el texto lo genera una IA. No inventes datos, medidas ni precios que no aparezcan.
Devuelve SOLO JSON: {"title": string, "seoTitle": string, "description": string, "seoDescription": string}`
}

const str = (v, f) => (typeof v === 'string' && v.trim() ? v.trim() : f)

async function main() {
  if (!nvidiaOn) throw new Error('NVIDIA no está configurado (define NVIDIA_API_KEY)')
  const srcFile = readFileSync(OUT, 'utf8')
  const start = srcFile.indexOf('[', srcFile.indexOf('= [', srcFile.indexOf('CATALOG_SEED')))
  const end = srcFile.lastIndexOf(']')
  const arr = JSON.parse(srcFile.slice(start, end + 1))

  const n = Math.min(arr.length, LIMIT)
  console.log(`Puliendo SEO de ${n}/${arr.length} productos… ${WRITE ? '(APLICANDO)' : '(dry-run)'}\n`)

  let changed = 0
  for (let i = 0; i < n; i++) {
    const p = arr[i]
    const out = await nvidiaJson(promptFor(p))
    if (!out) { console.log(`  ~ [${i + 1}] sin cambios (IA no respondió): ${p.title.slice(0, 50)}`); continue }
    const newTitle = str(out.title, p.title).slice(0, 140)
    console.log(`  #${i + 1} [${p.typeFishing}]`)
    console.log(`     antes: ${p.title}`)
    console.log(`     ahora: ${newTitle}`)
    if (WRITE) {
      p.title = newTitle
      p.seoTitle = str(out.seoTitle, newTitle).slice(0, 90)
      p.description = str(out.description, p.description).slice(0, 1200)
      p.seoDescription = str(out.seoDescription, p.seoDescription ?? '').slice(0, 165)
      p.aiOptimized = true
      changed++
    }
  }

  if (!WRITE) {
    console.log(`\nDry-run. Para aplicar a todo: node scripts/polish-seo.mjs --write`)
    return
  }
  writeFileSync(OUT, srcFile.slice(0, start) + JSON.stringify(arr, null, 2) + srcFile.slice(end + 1))
  console.log(`\n✅ ${changed} fichas pulidas y guardadas en catalog-data.ts.`)
  console.log('Reseed de la base de datos…')
  execFileSync('node', [join(__dirname, 'reseed-db.mjs')], { stdio: 'inherit' })
}

main().catch((e) => { console.error('\n❌', e.message); process.exit(1) })
