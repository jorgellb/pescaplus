/** Mientras carga una página del panel (ver app/cuenta/loading.tsx: las públicas no llevan esqueleto). */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-hidden="true">
      <div className="h-8 w-1/3 max-w-xs bg-ink/10 rounded-xl" />
      <div className="h-48 bg-ink/10 rounded-xl" />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
