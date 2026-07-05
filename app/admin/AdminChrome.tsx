'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin', label: 'Productos', icon: '📦' },
  { href: '/admin/import', label: 'Importar IA', icon: '🛒' },
  { href: '/admin/settings', label: 'Configuración', icon: '⚙️' },
]

export default function AdminChrome({
  children,
  usingDefaultPassword,
}: {
  children: React.ReactNode
  usingDefaultPassword: boolean
}) {
  const pathname = usePathname()

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin'
  }

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/70 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-2xl">🎣</span>
              <span className="font-black tracking-tight text-slate-100">
                PescaPlus <span className="text-cyan-400">Admin</span>
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex text-xs font-semibold text-slate-400 hover:text-cyan-400 px-3 py-2 transition-colors"
            >
              Ver tienda ↗
            </Link>
            <button
              onClick={logout}
              className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-white/5 px-4 py-2 rounded-lg transition-all"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="sm:hidden flex items-center gap-1 px-4 pb-3">
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      {usingDefaultPassword && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs text-center py-2 px-4">
          ⚠️ Estás usando la contraseña de administración por defecto. Define{' '}
          <code className="font-mono font-bold">ADMIN_PASSWORD</code> antes de desplegar en producción.
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
