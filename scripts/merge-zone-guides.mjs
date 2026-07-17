/** Merge content/zone-guides/*.json into content/zone-guides.json (the runtime file). */
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const dir = 'content/zone-guides'
const out = {}
let n = 0
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const slug = f.replace(/\.json$/, '')
  out[slug] = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  n++
}
writeFileSync('content/zone-guides.json', JSON.stringify(out))
console.log(`Merged ${n} guides -> content/zone-guides.json (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`)
