/**
 * Tiny client-side bus so any button (navbar, footer…) can open the floating
 * chat widget. `openAsesor()` returns false when no widget is mounted (e.g. on
 * /advice or /admin), letting the caller fall back to navigating to /advice.
 */
type Handler = () => void

const handlers = new Set<Handler>()

export function onOpenAsesor(handler: Handler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function openAsesor(): boolean {
  if (handlers.size === 0) return false
  handlers.forEach((h) => h())
  return true
}
