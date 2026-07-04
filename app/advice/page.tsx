'use client'

import { useState, useRef, useEffect } from 'react'
import Layout from '@/components/Layout'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AdvicePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fishingTypes = [
    { id: 'spinning', name: 'Spinning' },
    { id: 'flyfishing', name: 'Fly Fishing' },
    { id: 'carp', name: 'Carp Fishing' },
    { id: 'sea', name: 'Sea Fishing' },
    { id: 'baitcasting', name: 'Baitcasting' },
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          typeFishing: selectedType,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        const assistantMessage: Message = { role: 'assistant', content: data.response }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Lo siento, hubo un error. Por favor intenta de nuevo.' 
        }])
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error. Por favor intenta de nuevo.' 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getInitialAdvice = async (typeFishing: string) => {
    setSelectedType(typeFishing)
    setLoading(true)

    try {
      const response = await fetch(`/api/chat?typeFishing=${typeFishing}`)
      const data = await response.json()
      
      if (data.success) {
        setMessages([{ 
          role: 'assistant', 
          content: data.response 
        }])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="bg-blue-800 text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Asistente IA de Pesca</h1>
          <p className="text-lg">
            Obtén consejos personalizados y recomendaciones de productos
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-gray-700 mb-2 font-semibold">Selecciona tipo de pesca:</p>
          <div className="flex flex-wrap gap-2">
            {fishingTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => getInitialAdvice(type.id)}
                className={`px-4 py-2 rounded-lg transition ${
                  selectedType === type.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md h-96 overflow-y-auto p-4 mb-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-12">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-lg">Selecciona un tipo de pesca para comenzar</p>
              <p className="text-sm mt-2">O escribe tu pregunta sobre pesca</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu pregunta sobre pesca..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Preguntas populares:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• ¿Qué equipo necesito para empezar en spinning?</li>
            <li>• ¿Cuál es la mejor técnica para pescar carpas?</li>
            <li>• ¿Qué señuelos funcionan mejor para truchas?</li>
            <li>• ¿Cómo preparar mi equipo para pesca en mar?</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}

