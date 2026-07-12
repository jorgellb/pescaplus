import { listContactMessages } from '@/lib/contact-store'

export const dynamic = 'force-dynamic'

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function AdminMessagesPage() {
  const messages = await listContactMessages(200)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 border-b border-ink/12 pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Mensajes</h1>
          <p className="text-ink/60 text-sm mt-1">Consultas recibidas desde el formulario de contacto.</p>
        </div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink/50 whitespace-nowrap">{messages.length} total</span>
      </div>

      {messages.length === 0 ? (
        <div className="border border-ink/15 rounded-xl bg-paper p-10 text-center text-ink/60 text-sm">
          Aún no hay mensajes.
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className="border border-ink/15 rounded-xl bg-paper p-4 sm:p-5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="min-w-0">
                  <span className="font-bold text-ink">{m.name || 'Sin nombre'}</span>{' '}
                  <a href={`mailto:${m.email}`} className="text-accent underline text-sm break-all">{m.email}</a>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink/40 whitespace-nowrap">{formatDate(m.createdAt)}</span>
              </div>
              {m.subject && <p className="font-bold text-sm text-ink/80">{m.subject}</p>}
              <p className="text-sm text-ink/70 whitespace-pre-wrap break-words">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
