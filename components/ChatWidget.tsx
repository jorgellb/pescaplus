'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ProductImage from '@/components/ProductImage'
import { toSafeHtml } from '@/lib/chat-format'
import { onOpenAsesor } from '@/lib/asesor-bus'
import type { ChatMessage, ChatProductRef } from '@/types'

type Message = { role: 'user' | 'assistant'; content: string; products?: ChatProductRef[] }

// Shared with the full /advice page so the conversation carries over both ways.
const STORAGE_KEY = 'pescaplus-chat-v1'

const QUICK_QUESTIONS = [
  '¿Qué equipo necesito para empezar en spinning?',
  '¿Qué señuelos van mejor para lucio?',
  'Recomiéndame un carrete económico',
]

export default function ChatWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Restore any prior conversation (shared with /advice).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setMessages(JSON.parse(saved))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      /* ignore */
    }
  }, [messages])

  // Scroll only the panel's own container, never the page.
  const scrollToBottom = useCallback(() => {
    const el = messagesRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    if (open) scrollToBottom()
  }, [messages, loading, open, scrollToBottom])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // …or from a `#asesor` deep-link.
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === '#asesor') setOpen(true)
    }
    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [])

  const executeSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return
    const userMessage: Message = { role: 'user', content: textToSend }
    const history = [...messages, userMessage]
    setMessages(history)
    setLoading(true)

    const patchLast = (patch: Partial<Message>) =>
      setMessages((prev) => {
        if (prev.length === 0) return prev
        const copy = prev.slice()
        copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch }
        return copy
      })

    let appended = false
    let content = ''
    let products: ChatProductRef[] | undefined
    const flush = () => {
      if (appended) {
        patchLast({ content, products })
      } else {
        appended = true
        setMessages((prev) => [...prev, { role: 'assistant', content, products }])
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m): ChatMessage => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      })
      if (!response.ok || !response.body) throw new Error('stream unavailable')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let metaParsed = false
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        if (!metaParsed) {
          const nl = buffer.indexOf('\n')
          if (nl === -1) continue
          try {
            products = JSON.parse(buffer.slice(0, nl)).products
          } catch {
            /* ignore malformed frame */
          }
          content = buffer.slice(nl + 1)
          buffer = ''
          metaParsed = true
          if (content) flush()
          continue
        }
        content += buffer
        buffer = ''
        flush()
      }
      if (!content.trim()) {
        content = 'No he podido generar una respuesta. Inténtalo de nuevo.'
        flush()
      }
    } catch (error) {
      console.error('Error in chat stream:', error)
      content = content || 'Error de red. Prueba otra vez.'
      flush()
    } finally {
      setLoading(false)
    }
  }

  // Keep a live reference so the bus always calls the latest closure (fresh
  // conversation history), avoiding stale-closure sends.
  const sendRef = useRef(executeSendMessage)
  useEffect(() => {
    sendRef.current = executeSendMessage
  })

  // Open on request from any button (navbar/footer/product/search) via the shared
  // bus; an optional question is auto-sent as if the user had typed it.
  useEffect(
    () =>
      onOpenAsesor((question) => {
        setOpen(true)
        if (question?.trim()) sendRef.current(question)
      }),
    [],
  )

  const sendMessage = () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    executeSendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const renderMessageContent = (content: string) =>
    content.split('\n').map((line, idx) => {
      const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\./.test(line.trim())
      return (
        <p
          key={idx}
          className={isBullet ? 'pl-3 py-0.5 text-ink/70 text-[13px] leading-relaxed' : 'min-h-[0.75rem] py-0.5 text-ink/90 text-[13px] leading-relaxed'}
          dangerouslySetInnerHTML={{ __html: toSafeHtml(line) }}
        />
      )
    })

  // Don't duplicate the assistant on its own page or clutter the admin backend.
  if (pathname === '/advice' || pathname.startsWith('/admin')) return null

  return (
    <>
      {/* Floating action button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir asesor de pesca"
          className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 bg-ink text-paper pl-3.5 pr-4 py-3 rounded-full border border-ink/15 shadow-hard-md hover:bg-accent hover:border-accent transition-colors group"
        >
          <span className="text-xl leading-none">🎣</span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest hidden sm:inline">Asesor</span>
          {messages.length === 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent border-2 border-paper group-hover:bg-ink" />
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed z-[60] bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] flex flex-col bg-paper border border-ink/15 rounded-2xl shadow-hard-md overflow-hidden max-h-[min(70vh,560px)] h-[70vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink/12 bg-ink text-paper">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-paper/10 rounded-full text-base">🎣</span>
              <div className="min-w-0">
                <p className="font-display uppercase text-base leading-none truncate">Asesor de pesca</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-paper/60 leading-none mt-1">En línea</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link
                href="/advice"
                onClick={() => setOpen(false)}
                aria-label="Abrir en página completa"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-paper/10 transition-colors"
                title="Pantalla completa"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar asesor"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-paper/10 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesRef} aria-live="polite" className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#eae6db]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-2">
                <span className="text-4xl w-16 h-16 flex items-center justify-center bg-paper border border-ink/15 rounded-2xl shadow-hard">🎣</span>
                <p className="text-[13px] text-ink/70 leading-relaxed max-w-[16rem]">
                  Hola 👋 Soy tu asesor de pesca. Pregúntame por equipo, técnicas o señuelos.
                </p>
                <div className="w-full space-y-1.5 pt-1">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => executeSendMessage(q)}
                      className="w-full text-left px-3 py-2 bg-paper border border-ink/15 rounded-xl text-[12px] font-semibold text-ink hover:bg-ink hover:text-paper transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={`flex items-start gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-7 h-7 bg-paper border border-ink/15 rounded-full flex items-center justify-center text-xs">🎣</div>
                  )}
                  <div className={`flex flex-col gap-1.5 max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`w-full p-3 border border-ink/15 rounded-xl ${message.role === 'user' ? 'bg-accent text-paper' : 'bg-paper'}`}>
                      {message.role === 'user' ? (
                        <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                      ) : (
                        <div className="space-y-0.5 break-words">
                          {renderMessageContent(message.content)}
                          {loading && index === messages.length - 1 && (
                            <span className="inline-block w-1.5 h-3.5 align-middle bg-accent animate-pulse" />
                          )}
                        </div>
                      )}
                    </div>
                    {message.role === 'assistant' && message.products && message.products.length > 0 && (
                      <div className="w-full space-y-1">
                        {message.products.slice(0, 3).map((p) => (
                          <Link
                            key={p.id}
                            href={`/products/${p.id}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 bg-paper border border-ink/15 rounded-xl p-1.5 pr-3 hover:bg-ink/5 transition-colors"
                          >
                            <span className="relative block w-9 h-9 flex-shrink-0 bg-[#e6e2d6] rounded-lg overflow-hidden">
                              <ProductImage src={p.imageUrl} alt={p.title} sizes="40px" className="absolute inset-0 w-full h-full object-cover" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[11px] font-bold text-ink leading-tight line-clamp-1">{p.title}</span>
                              <span className="block font-display text-sm text-ink leading-none">
                                {p.price.toFixed(2)} {p.currency === 'EUR' ? '€' : p.currency}
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-start gap-2 justify-start">
                <div className="flex-shrink-0 w-7 h-7 bg-paper border border-ink/15 rounded-full flex items-center justify-center text-xs">🎣</div>
                <div className="bg-paper border border-ink/15 rounded-xl p-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-2.5 border-t border-ink/12 bg-paper flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta…"
              className="flex-1 min-w-0 px-3 py-2.5 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/40 focus:outline-none focus:border-accent text-[13px] transition-colors"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="flex-shrink-0 w-11 bg-ink text-paper flex items-center justify-center rounded-xl border border-ink/15 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
