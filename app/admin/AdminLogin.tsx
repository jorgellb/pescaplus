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
    <div className="min-h-screen bg-[#060b13] text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">🎣</span>
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
              PescaPlus
            </span>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Panel de administración
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 p-6 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md shadow-2xl shadow-black/40"
        >
          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 text-sm transition-all"
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
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold px-6 py-3 rounded-xl shadow-md shadow-cyan-500/10 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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

        <p className="text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-cyan-400 transition-colors">← Volver a la tienda</Link>
        </p>
      </div>
    </div>
  )
}
