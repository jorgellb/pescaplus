import Layout from '@/components/Layout'

export default function Loading() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-14 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-8" aria-hidden="true">
          <div className="h-10 w-2/3 max-w-md bg-ink/10 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square bg-ink/10 rounded-xl" />
                <div className="h-4 w-3/4 bg-ink/10 rounded" />
                <div className="h-4 w-1/3 bg-ink/10 rounded" />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">Cargando…</span>
      </div>
    </Layout>
  )
}
