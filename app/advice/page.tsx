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
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function toSafeHtml(line: string): string {
  return escapeHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong class="text-accent">$1</strong>')
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
        { role: 'assistant', content: data.success ? data.response : 'Hubo un problema al conectar con el asistente. Inténtalo de nuevo.' },
      ])
    } catch (error) {
      console.error('Error in chat request:', error)
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error de red. Prueba otra vez.' }])
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
      <section className="bg-paper border-b-2 border-ink">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Asistente con IA</p>
          <h1 className="font-display uppercase text-5xl md:text-6xl leading-none text-ink">Consejos de pesca</h1>
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
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-tight border-2 border-ink transition-colors disabled:opacity-50 ${
                  selectedType === type.id ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink hover:text-paper'
                }`}
              >
                <CategoryIcon id={type.id} className="w-4 h-4" strokeWidth={1.9} /> {type.name}
              </button>
            ))}
          </div>
        </div>

        <div className="border-2 border-ink shadow-hard bg-paper overflow-hidden flex flex-col h-[520px]">
          {messages.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-ink bg-paper">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">Conversación</span>
              <button onClick={clearConversation} className="font-mono text-[11px] font-bold uppercase text-ink hover:text-accent">Limpiar</button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-[#eae6db]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 max-w-sm mx-auto">
                <span className="text-5xl w-20 h-20 flex items-center justify-center bg-paper border-2 border-ink shadow-hard">🤖</span>
                <div className="space-y-1">
                  <h3 className="font-display uppercase text-xl text-ink">Asistente activo</h3>
                  <p className="text-xs text-ink/60 leading-relaxed">Elige una modalidad o escribe tu pregunta abajo.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-paper border-2 border-ink flex items-center justify-center text-sm">🤖</div>
                    )}
                    <div
                      className={`max-w-[85%] md:max-w-[75%] p-4 border-2 border-ink ${
                        message.role === 'user' ? 'bg-accent text-paper' : 'bg-paper'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div className="space-y-0.5">{renderMessageContent(message.content)}</div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-ink text-paper flex items-center justify-center text-sm">👤</div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex items-start gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-paper border-2 border-ink flex items-center justify-center text-sm">🤖</div>
                    <div className="bg-paper border-2 border-ink p-4">
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

          <div className="p-3 border-t-2 border-ink bg-paper">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta…"
                className="flex-1 px-4 py-3 bg-paper border-2 border-ink text-ink placeholder-ink/40 focus:outline-none focus:border-accent text-sm transition-colors"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-ink text-paper px-6 text-sm font-bold uppercase border-2 border-ink hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                className="p-3.5 bg-paper border-2 border-ink shadow-hard hover-shift text-xs text-ink font-bold uppercase tracking-tight text-left flex justify-between items-center gap-2 disabled:opacity-50"
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
