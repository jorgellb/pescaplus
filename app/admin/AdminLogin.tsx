'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AdminLogin({ usingDefaultPassword }: { usingDefaultPassword: boolean }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        // Reload so the server layout re-evaluates the session and renders the panel.
        window.location.reload()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'No se pudo iniciar sesión')
      }
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">🎣</span>
            <span className="font-display text-3xl uppercase tracking-tight text-ink">
              Pesca<span className="text-accent">Plus</span>
            </span>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            Panel de administración
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 p-6 rounded-2xl bg-white border border-ink/15 backdrop-blur-md shadow-2xl shadow-black/40"
        >
          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="text-xs font-bold uppercase tracking-widest text-ink/60">
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-sm transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-ink text-paper hover:bg-accent font-extrabold px-6 py-3 rounded-xl shadow-md  active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          {usingDefaultPassword && (
            <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 leading-relaxed">
              ⚠️ No hay <code className="font-mono">ADMIN_PASSWORD</code> configurada. Contraseña de
              desarrollo: <code className="font-mono font-bold">pescaplus-admin</code>. Define
              <code className="font-mono"> ADMIN_PASSWORD</code> antes de desplegar.
            </p>
          )}
        </form>

        <p className="text-center text-xs text-ink/50">
          <Link href="/" className="hover:text-accent transition-colors">← Volver a la tienda</Link>
        </p>
      </div>
    </div>
  )
}
