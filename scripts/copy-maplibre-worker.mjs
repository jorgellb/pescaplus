import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Copia el worker de MapLibre a /public.
 *
 * MapLibre lo carga con `new URL('./maplibre-gl-worker.mjs', import.meta.url)`.
 * Turbopack no emite ese fichero, así que la petición caía en el catch-all de
 * Next, devolvía HTML y el navegador la rechazaba por MIME type — el mapa
 * montaba el canvas pero no dibujaba nada, sin error visible en pantalla.
 *
 * Sirviéndolo desde nuestro propio origen también encaja con la CSP
 * (`worker-src 'self' blob:`), sin abrir la política a terceros.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const from = join(root, 'node_modules/maplibre-gl/dist')
const to = join(root, 'public/maplibre')

await mkdir(to, { recursive: true })
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  // Se quita la referencia al mapa de fuente: no publicamos los .map y el
  // navegador los pedía, ensuciando la consola con 404 que no son problema
  // real pero esconden los que sí lo son.
  const code = (await readFile(join(from, f), 'utf8')).replace(/\n?\/\/# sourceMappingURL=.*$/m, '')
  await writeFile(join(to, f), code)
  console.log('copiado', f)
}
