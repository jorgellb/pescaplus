import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import MessageThread from '@/components/messages/MessageThread'
import { getSessionUser } from '@/lib/auth'
import { getOperatorByUser, getOperator } from '@/lib/operators-store'
import { getUserById } from '@/lib/users-store'
import { getThread, listMessages, roleInThread } from '@/lib/messages-store'
import { getCharter } from '@/lib/charters-store'
import { getSpot } from '@/lib/fishing-spots'
import { fmtDayLabel } from '@/lib/solunar-format'

export const metadata: Metadata = { title: 'Conversación', robots: { index: false, follow: true } }

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) redirect('/entrar')

  const thread = await getThread(id)
  if (!thread) notFound()
  const owned = await getOperatorByUser(user.id)
  const role = roleInThread(thread, user.id, owned?.id)
  if (!role) notFound()

  const [messages, charter] = await Promise.all([listMessages(id), getCharter(thread.charterId)])
  const otherName = role === 'user'
    ? ((await getOperator(thread.operatorId))?.businessName || (await getOperator(thread.operatorId))?.name || 'Patrón')
    : ((await getUserById(thread.userId))?.name || 'Pescador')
  const spotName = charter ? (getSpot(charter.spotSlug)?.name ?? charter.spotSlug) : 'Chárter'

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-3">
            <Link href="/cuenta?tab=mensajes" className="hover:text-accent">← Mensajes</Link>
          </nav>
          <h1 className="font-display uppercase text-2xl sm:text-3xl leading-none text-ink">{otherName}</h1>
          {charter && (
            <p className="text-[13px] text-ink/60 mt-1 capitalize">
              <Link href={`/charters/${charter.id}`} className="hover:text-accent">{spotName} · {fmtDayLabel(charter.dateISO)} · {charter.pricePerPerson} €/pers</Link>
            </p>
          )}
        </div>
      </section>
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <MessageThread threadId={id} myRole={role} initial={messages.map((m) => ({ id: m.id, sender: m.sender, body: m.body, createdAt: m.createdAt }))} />
      </section>
    </Layout>
  )
}
