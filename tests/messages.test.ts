import { describe, it, expect, beforeEach } from 'vitest'
import { requestMagicLink, consumeMagicLink } from '@/lib/auth'
import { registerOperator, setOperatorVerified, getOperatorByUser } from '@/lib/operators-store'
import { createCharter } from '@/lib/charters-store'
import { getOrCreateThread, postMessage, listMessages, markThreadRead, listInbox, unreadCount, roleInThread } from '@/lib/messages-store'

const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => {
  for (const k of ['__pescaplusUsers', '__pescaplusTokens', '__pescaplusSessions', '__pescaplusOperators', '__pescaplusCharters', '__pescaplusBookings', '__pescaplusThreads', '__pescaplusMessages']) g[k] = []
})

function tokenFromLink(link: string): string { return new URL(link).searchParams.get('token') || '' }
async function makeUser(email: string) { return (await consumeMagicLink(tokenFromLink((await requestMagicLink(email)).devLink!)))! }

describe('mensajería pescador–patrón', () => {
  it('abre un hilo, cuenta no leídos por lado y resuelve roles', async () => {
    const patron = await makeUser('patron@x.es')
    const op = await registerOperator({ name: 'Paco', email: 'patron@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' }, patron.id)
    await setOperatorVerified(op.id, true)
    const charter = await createCharter(op.id, op.manageToken, { spotSlug: 'tarifa', dateISO: '2030-03-03', timeStart: '08:00', modality: 'barco', pricePerPerson: 60, maxPlaces: 6, minToConfirm: 1 })
    const angler = await makeUser('ana@x.es')

    const thread = await getOrCreateThread(charter.id, op.id, angler.id)
    // Idempotente: mismo (charter, pescador) → mismo hilo.
    expect((await getOrCreateThread(charter.id, op.id, angler.id)).id).toBe(thread.id)

    // Roles.
    expect(roleInThread(thread, angler.id)).toBe('user')
    expect(roleInThread(thread, patron.id, op.id)).toBe('operator')
    expect(roleInThread(thread, 'extraño', 'otro-op')).toBeNull()

    // El pescador escribe → sube el no leído del patrón.
    await postMessage(thread.id, 'user', 'Hola, ¿hay sitio el sábado?')
    let inboxOp = await listInbox(patron.id, op.id)
    expect(inboxOp).toHaveLength(1)
    expect(inboxOp[0].role).toBe('operator')
    expect(inboxOp[0].unread).toBe(1)
    expect(inboxOp[0].lastBody).toMatch(/sábado/)
    expect(await unreadCount(patron.id, op.id)).toBe(1)

    // El patrón lee y responde.
    await markThreadRead(thread.id, 'operator')
    expect(await unreadCount(patron.id, op.id)).toBe(0)
    await postMessage(thread.id, 'operator', 'Sí, quedan 2 plazas.')
    expect(await unreadCount(angler.id)).toBe(1) // el pescador tiene 1 sin leer

    const msgs = await listMessages(thread.id)
    expect(msgs.map((m) => m.sender)).toEqual(['user', 'operator'])
    expect(msgs[1].body).toMatch(/2 plazas/)
  })

  it('mensaje vacío se rechaza', async () => {
    const patron = await makeUser('p2@x.es')
    const op = await registerOperator({ name: 'P2', email: 'p2@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' }, patron.id)
    await setOperatorVerified(op.id, true)
    const charter = await createCharter(op.id, op.manageToken, { spotSlug: 'tarifa', dateISO: '2030-04-04', timeStart: '08:00', modality: 'barco', pricePerPerson: 60, maxPlaces: 4, minToConfirm: 1 })
    const u = await makeUser('u@x.es')
    const t = await getOrCreateThread(charter.id, op.id, u.id)
    await expect(postMessage(t.id, 'user', '   ')).rejects.toThrow(/vacío/i)
  })

  it('al iniciar sesión se vincula un patrón sin dueño con el mismo email', async () => {
    // Operador registrado SIN cuenta (patrón antiguo por token).
    const op = await registerOperator({ name: 'Antiguo', email: 'viejo@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' })
    // El dueño inicia sesión con ese email → reclama el perfil.
    const user = await makeUser('viejo@x.es')
    const owned = await getOperatorByUser(user.id)
    expect(owned!.id).toBe(op.id)
  })
})
