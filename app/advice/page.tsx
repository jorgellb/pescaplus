'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { FISHING_TYPES } from '@/lib/fishing'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import ProductImage from '@/components/ProductImage'
import type { ChatMessage, ChatProductRef } from '@/types'

type Message = { role: 'user' | 'assistant'; content: string; products?: ChatProductRef[] }

const STORAGE_KEY = 'pescaplus-chat-v1'
const ADVICE_TOPIC_IDS = ['canas', 'carretes', 'senuelos', 'anzuelos', 'lineas']
const ADVICE_TYPES = FISHING_TYPES.filter((t) => ADVICE_TOPIC_IDS.includes(t.id))

const suggestedQuestions = [
  '¿Qué equipo necesito para empezar en spinning?',
  '¿Cuál es la mejor técnica para pescar carpas?',
  '¿Qué señuelos funcionan mejor para truchas?',
  '¿Cómo preparar mi bajo de línea para pesca en mar?',
]

const FOLLOW_UPS = [
  '¿Qué señuelos me recomiendas?',
  '¿Qué nudo debería usar?',
  '¿Qué línea es mejor?',
  'Recomiéndame equipo económico',
]

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function toSafeHtml(line: string): string {
  return escapeHtml(line)
    // links (e.g. category recommendations) — only relative or https URLs
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) =>
      /^(https?:\/\/|\/)/i.test(url)
        ? `<a href="${url}" class="text-accent underline font-semibold hover:opacity-80">${label}</a>`
        : label,
    )
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-accent">$1</strong>')
}

export default function AdvicePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const autoAskRef = useRef(false)

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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  const executeSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return
    const userMessage: Message = { role: 'user', content: textToSend }
    const history = [...messages, userMessage]
    setMessages(history)
    setLoading(true)

    // Patch the streaming assistant message in place as tokens arrive.
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
          typeFishing: selectedType || undefined,
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
          if (nl === -1) continue // wait for the full metadata frame
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

  // Deep-link from a product page: /advice?ask=... auto-sends the question on load.
  useEffect(() => {
    if (autoAskRef.current) return
    const q = new URLSearchParams(window.location.search).get('ask')?.trim()
    if (q) {
      autoAskRef.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect
      executeSendMessage(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const getInitialAdvice = async (typeFishing: string) => {
    if (loading) return
    setSelectedType(typeFishing)
    setMessages([])
    setLoading(true)
    try {
      const response = await fetch(`/api/chat?typeFishing=${typeFishing}`)
      const data = await response.json()
      if (data.success) setMessages([{ role: 'assistant', content: data.response, products: data.products }])
    } catch (error) {
      console.error('Error fetching initial advice:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearConversation = () => {
    setMessages([])
    setSelectedType('')
  }

  const renderMessageContent = (content: string) =>
    content.split('\n').map((line, idx) => {
      const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\./.test(line.trim())
      return (
        <p
          key={idx}
          className={isBullet ? 'pl-4 py-0.5 text-ink/70 text-sm leading-relaxed' : 'min-h-[1rem] py-1 text-ink/90 text-sm leading-relaxed'}
          dangerouslySetInnerHTML={{ __html: toSafeHtml(line) }}
        />
      )
    })

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Asesor de pesca</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Consejos de pesca</h1>
          <p className="text-ink/60 text-sm max-w-xl mt-3">
            Pregunta sobre técnicas, nudos, señuelos recomendados o configuraciones de bajo de línea.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        <div className="mb-6 space-y-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Elige modalidad:</p>
          <div className="flex flex-wrap gap-2">
            {ADVICE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => getInitialAdvice(type.id)}
                disabled={loading}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-tight border border-ink/15 rounded-xl transition-colors disabled:opacity-50 ${
                  selectedType === type.id ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink hover:text-paper'
                }`}
              >
                <CategoryIcon id={type.id} className="w-4 h-4" strokeWidth={1.9} /> {type.name}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-ink/15 rounded-xl shadow-hard bg-paper overflow-hidden flex flex-col h-[520px]">
          {messages.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink/12 bg-paper">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">Conversación</span>
              <button onClick={clearConversation} className="font-mono text-[11px] font-bold uppercase text-ink hover:text-accent">Limpiar</button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-[#eae6db]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 max-w-sm mx-auto">
                <span className="text-5xl w-20 h-20 flex items-center justify-center bg-paper border border-ink/15 rounded-xl shadow-hard">🎣</span>
                <div className="space-y-1">
                  <h3 className="font-display uppercase text-xl text-ink">Tu asesor de pesca</h3>
                  <p className="text-xs text-ink/60 leading-relaxed">Elige una modalidad o escribe tu pregunta abajo.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-paper border border-ink/15 rounded-xl flex items-center justify-center text-sm">🎣</div>
                    )}
                    <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`w-full p-4 border border-ink/15 rounded-xl ${message.role === 'user' ? 'bg-accent text-paper' : 'bg-paper'}`}>
                        {message.role === 'user' ? (
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <div className="space-y-0.5">
                            {renderMessageContent(message.content)}
                            {loading && index === messages.length - 1 && (
                              <span className="inline-block w-2 h-4 align-middle bg-accent animate-pulse" />
                            )}
                          </div>
                        )}
                      </div>
                      {message.role === 'assistant' && message.products && message.products.length > 0 && (
                        <div className="w-full space-y-1.5">
                          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40">Productos recomendados</p>
                          <div className="flex flex-wrap gap-2">
                            {message.products.map((p) => (
                              <Link
                                key={p.id}
                                href={`/products/${p.id}`}
                                target="_blank"
                                className="flex items-center gap-2 bg-paper border border-ink/15 rounded-xl p-1.5 pr-3 hover:bg-ink/5 transition-colors max-w-[210px]"
                              >
                                <span className="relative block w-9 h-9 flex-shrink-0 bg-[#e6e2d6] overflow-hidden">
                                  <ProductImage src={p.imageUrl} alt={p.title} sizes="40px" className="absolute inset-0 w-full h-full object-cover" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-[11px] font-bold text-ink leading-tight line-clamp-1">{p.title}</span>
                                  <span className="block font-display text-sm text-ink leading-none">
                                    {p.price.toFixed(2)} {p.currency === 'EUR' ? '€' : p.currency}
                                  </span>
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-ink text-paper flex items-center justify-center text-sm">👤</div>
                    )}
                  </div>
                ))}
                {loading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex items-start gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-paper border border-ink/15 rounded-xl flex items-center justify-center text-sm">🎣</div>
                    <div className="bg-paper border border-ink/15 rounded-xl p-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-accent animate-bounce" />
                        <div className="w-2 h-2 bg-accent animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-accent animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="p-3 border-t border-ink/12 bg-paper">
            {!loading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
              <div className="flex gap-2 overflow-x-auto pb-2.5 -mx-1 px-1 scrollbar-none">
                {FOLLOW_UPS.map((q) => (
                  <button
                    key={q}
                    onClick={() => executeSendMessage(q)}
                    className="flex-shrink-0 px-3 py-1.5 bg-paper border border-ink/15 rounded-xl text-[11px] font-bold uppercase tracking-tight text-ink hover:bg-ink hover:text-paper transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta…"
                className="flex-1 px-4 py-3 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/40 focus:outline-none focus:border-accent text-sm transition-colors"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-ink text-paper px-6 text-sm font-bold uppercase border border-ink/15 rounded-xl hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Consultas frecuentes:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => executeSendMessage(q)}
                disabled={loading}
                className="p-3.5 bg-paper border border-ink/15 rounded-xl shadow-hard hover-shift text-xs text-ink font-bold uppercase tracking-tight text-left flex justify-between items-center gap-2 disabled:opacity-50"
              >
                <span>{q}</span>
                <span className="text-accent text-base">→</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  )
}
