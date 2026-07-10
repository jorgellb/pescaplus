'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import { FISHING_TYPES } from '@/lib/fishing'
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

/** Escape HTML so model/mock output can never inject markup, then render a
 * minimal, safe subset (**bold**) as our own <strong> tags. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toSafeHtml(line: string): string {
  return escapeHtml(line).replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="text-cyan-300 font-semibold">$1</strong>',
  )
}

export default function AdvicePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Restore any previous conversation from this browser.
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

  // Persist the conversation so a refresh doesn't lose it.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      /* storage may be unavailable (private mode) */
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
            : 'Lo siento, hubo un problema al conectar con el asistente. Por favor intenta de nuevo.',
        },
      ])
    } catch (error) {
      console.error('Error in chat request:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Lo siento, ocurrió un error de red. Asegúrate de tener conexión y prueba otra vez.',
        },
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
      if (data.success) {
        setMessages([{ role: 'assistant', content: data.response }])
      }
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
              ? 'pl-4 py-0.5 text-slate-300 text-sm leading-relaxed'
              : 'min-h-[1rem] py-1 text-slate-200 text-sm md:text-[14.5px] leading-relaxed'
          }
          dangerouslySetInnerHTML={{ __html: toSafeHtml(line) }}
        />
      )
    })

  return (
    <Layout>
      {/* Banner Page */}
      <section className="relative overflow-hidden py-12 bg-gradient-to-r from-slate-900 via-[#0B1528] to-slate-900 border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(14,116,144,0.12),rgba(255,255,255,0))]" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Consultas con Inteligencia Artificial
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-none">
            Asistente IA de PescaPlus
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Pregunta dudas sobre técnicas de lance, elección de nudos, señuelos recomendados o
            configuraciones de bajo de línea.
          </p>
        </div>
      </section>

      {/* Chat Dashboard container */}
      <section className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        {/* Modality Filter Box */}
        <div className="mb-6 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Modalidad específica a asesorar:
          </p>
          <div className="flex flex-wrap gap-2.5">
            {ADVICE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => getInitialAdvice(type.id)}
                disabled={loading}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedType === type.id
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-md shadow-cyan-500/5'
                    : 'bg-slate-900/40 text-slate-400 border-white/5 hover:border-white/10 hover:text-slate-300'
                }`}
              >
                <span>{type.icon}</span> {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Chat window panel */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/20 backdrop-blur-md overflow-hidden flex flex-col h-[520px] shadow-2xl shadow-black/40">
          {/* Header with clear action */}
          {messages.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-slate-950/40">
              <span className="text-xs font-semibold text-slate-400">Conversación en curso</span>
              <button
                onClick={clearConversation}
                className="text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
              >
                Limpiar chat
              </button>
            </div>
          )}

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto my-auto">
                <span className="text-6xl p-4 bg-cyan-500/5 rounded-full border border-cyan-500/10 animate-bounce">
                  🤖
                </span>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-200">Asistente Virtual Activo</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Selecciona un tipo de pesca arriba para recibir un informe inicial completo, o
                    envíame una pregunta directa a continuación.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3.5 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-sm shadow">
                        🤖
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-lg ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-tr-none'
                          : 'bg-slate-900/60 border border-white/5 rounded-tl-none space-y-1'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      ) : (
                        <div className="space-y-0.5">{renderMessageContent(message.content)}</div>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-sm shadow font-extrabold text-slate-950">
                        👤
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start gap-3.5 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-sm">
                      🤖
                    </div>
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl rounded-tl-none p-4 shadow-lg">
                      <div className="flex items-center gap-1.5 py-1">
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                        <div
                          className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        />
                        <div
                          className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.4s' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Form message input */}
          <div className="p-4 border-t border-white/5 bg-slate-950/40">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta sobre aparejos o técnicas..."
                className="flex-1 px-4 py-3.5 bg-slate-900 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 text-sm transition-all"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 px-6 rounded-xl font-extrabold text-sm shadow-md shadow-cyan-500/10 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Enviar</span> 🚀
              </button>
            </div>
          </div>
        </div>

        {/* Suggestion cards row */}
        <div className="mt-8 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Consultas Frecuentes Directas:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => executeSendMessage(q)}
                disabled={loading}
                className="p-3.5 rounded-xl bg-slate-900/30 border border-white/5 hover:border-cyan-500/25 hover:bg-slate-900/50 hover:shadow-md hover:shadow-cyan-500/5 text-xs text-slate-300 font-semibold cursor-pointer transition-all active:scale-[0.98] leading-relaxed flex justify-between items-center gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{q}</span>
                <span className="text-cyan-400 text-base">➔</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  )
}
