/**
 * Audit every generated zone guide before shipping: field presence/lengths,
 * banned terms (AI/marketplace), English chain-of-thought leaks and stray
 * "undefined"/placeholder artefacts. Exit 1 if anything fails.
 */
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const dir = 'content/zone-guides'
const BANNED = /\b(AI|IA|inteligencia artificial|prompt|modelo de lenguaje|aliexpress|marketplace|chatgpt)\b/i
const ENGLISH = /\b(the|we|let's|must|should|paragraph|words|craft)\b/gi
const SPANISH = /\b(el|la|los|las|de|con|para|que|una)\b/gi

let files = 0
const problems = []
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  files++
  const slug = f.replace(/\.json$/, '')
  const g = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  const fields = { intro: [420, 1600], species: [380, 1500], techniques: [380, 1500], seasons: [250, 1100] }
  for (const [k, [min, max]] of Object.entries(fields)) {
    const t = g[k] ?? ''
    if (t.length < min || t.length > max) problems.push(`${slug}.${k}: longitud ${t.length} fuera de [${min},${max}]`)
    if (BANNED.test(t)) problems.push(`${slug}.${k}: término prohibido`)
    const en = (t.match(ENGLISH) ?? []).length
    const es = (t.match(SPANISH) ?? []).length
    if (en > 2 && en >= es) problems.push(`${slug}.${k}: posible fuga en inglés`)
    if (/undefined|\[object|null,/.test(t)) problems.push(`${slug}.${k}: artefacto`)
  }
  if (!Array.isArray(g.tips) || g.tips.length < 3) problems.push(`${slug}.tips: ${g.tips?.length ?? 0} consejos`)
}
console.log(`Guías auditadas: ${files}`)
if (problems.length) {
  console.log(`PROBLEMAS (${problems.length}):`)
  for (const p of problems.slice(0, 40)) console.log(' -', p)
  process.exit(1)
}
console.log('Todas válidas ✅')
