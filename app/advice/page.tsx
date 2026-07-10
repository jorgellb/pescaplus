'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import { FISHING_TYPES } from '@/lib/fishing'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import type { ChatMessage } from '@/types'

type Message = { role: 'user' | 'assistant'; content: string }

const STORAGE_KEY = 'pescaplus-chat-v1'
const ADVICE_TOPIC_IDS = ['canas', 'carretes', 'senuelos', 'anzuelos', 'lineas']
const ADVICE_TYPES = FISHING_TYPES.filter((t) => ADVICE_TOPIC_IDS.includes(t.id))

const suggestedQuestions = [
  '¿Qué equipo necesito para empezar en spinning?',
  '¿Cuál es la mejor técnica para pescar carpas?',
  '¿Qué señuelos funcionan mejor para truchas?',
  '¿Cómo preparar mi bajo de línea para pesca en mar?',
]

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toSafeHtml(line: string): string {
  return escapeHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong class="text-sky-700 font-semibold">$1</strong>')
}

export default function AdvicePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      // Hydrating from an external store (localStorage) is a valid effect use.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setMessages(JSON.parse(saved))
    } catch {
      /* ignore malformed storage */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      /* storage may be unavailable */
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m): ChatMessage => ({ role: m.role, content: m.content })),
          typeFishing: selectedType || undefined,
        }),
      })
      const data = await response.json()
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.success
            ? data.response
            : 'Lo siento, hubo un problema al conectar con el asistente. Inténtalo de nuevo.',
        },
      ])
    } catch (error) {
      console.error('Error in chat request:', error)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Lo siento, ocurrió un error de red. Prueba otra vez.' },
      ])
    } finally {
      setLoading(false)
    }
  }

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
      if (data.success) setMessages([{ role: 'assistant', content: data.response }])
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
      const isBullet =
        line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\./.test(line.trim())
      return (
        <p
          key={idx}
          className={
            isBullet
              ? 'pl-4 py-0.5 text-slate-600 text-sm leading-relaxed'
              : 'min-h-[1rem] py-1 text-slate-700 text-sm md:text-[14.5px] leading-relaxed'
          }
          dangerouslySetInnerHTML={{ __html: toSafeHtml(line) }}
        />
      )
    })

  return (
    <Layout>
      {/* Banner */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600">Asistente con IA</span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Consejos de pesca al instante
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            Pregunta sobre técnicas, nudos, señuelos recomendados o configuraciones de bajo de línea.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        {/* Modality filter */}
        <div className="mb-6 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Elige una modalidad:</p>
          <div className="flex flex-wrap gap-2.5">
            {ADVICE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => getInitialAdvice(type.id)}
                disabled={loading}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedType === type.id
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <CategoryIcon id={type.id} className="w-4 h-4" strokeWidth={1.7} /> {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[520px]">
          {messages.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-semibold text-slate-500">Conversación en curso</span>
              <button onClick={clearConversation} className="text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors">
                Limpiar chat
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/60">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 max-w-sm mx-auto">
                <span className="text-5xl w-20 h-20 flex items-center justify-center bg-sky-50 rounded-full border border-sky-100">🤖</span>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">Asistente virtual activo</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Elige una modalidad para un informe inicial, o escribe tu pregunta abajo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((message, index) => (
                  <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sm">🤖</div>
                    )}
                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-sky-600 text-white rounded-tr-sm shadow-sm'
                          : 'bg-white border border-slate-200 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div className="space-y-0.5">{renderMessageContent(message.content)}</div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-sm text-white">👤</div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sm">🤖</div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta..."
                className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 text-sm transition-all"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-sky-600 hover:bg-sky-700 text-white px-6 rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Enviar 🚀
              </button>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="mt-8 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Consultas frecuentes:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => executeSendMessage(q)}
                disabled={loading}
                className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:shadow-sm text-xs text-slate-600 font-semibold cursor-pointer transition-all active:scale-[0.98] flex justify-between items-center gap-2 text-left disabled:opacity-50"
              >
                <span>{q}</span>
                <span className="text-sky-500 text-base">➔</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  )
}
