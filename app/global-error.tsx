'use client'

// Catches errors thrown in the root layout itself. Must render its own
// <html>/<body> because it replaces the root layout.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#f2efe6', color: '#111', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ maxWidth: 420 }}>
            <p style={{ letterSpacing: 3, textTransform: 'uppercase', color: '#0f766e', fontWeight: 700, fontSize: 12 }}>PescaPlus</p>
            <h1 style={{ fontSize: 40, fontWeight: 800, margin: '12px 0' }}>Algo ha fallado</h1>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>Ha ocurrido un error inesperado. Inténtalo de nuevo.</p>
            <button
              onClick={reset}
              style={{ background: '#111', color: '#f2efe6', border: 'none', padding: '12px 24px', fontWeight: 700, textTransform: 'uppercase', fontSize: 14, cursor: 'pointer', borderRadius: 12 }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
