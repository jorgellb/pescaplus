/**
 * Tiny client-side bus so any button (navbar, footer…) can open the floating
 * chat widget. `openAsesor()` returns false when no widget is mounted (e.g. on
 * /advice or /admin), letting the caller fall back to navigating to /advice.
 */
type Handler = (question?: string) => void

const handlers = new Set<Handler>()

export function onOpenAsesor(handler: Handler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

/**
 * Open the floating chat widget. When `question` is given, the widget auto-sends
 * it as if the user typed it. Returns false when no widget is mounted (e.g. on
 * /advice or /admin), so callers can fall back to navigating.
 */
export function openAsesor(question?: string): boolean {
  if (handlers.size === 0) return false
  handlers.forEach((h) => h(question))
  return true
}
