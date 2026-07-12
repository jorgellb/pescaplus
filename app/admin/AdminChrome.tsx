'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin', label: 'Productos', icon: '📦' },
  { href: '/admin/taxonomia', label: 'Taxonomía', icon: '🗂️' },
  { href: '/admin/import', label: 'Importar IA', icon: '🛒' },
  { href: '/admin/guides', label: 'Guías', icon: '📝' },
  { href: '/admin/analytics', label: 'Analítica', icon: '📊' },
  { href: '/admin/mensajes', label: 'Mensajes', icon: '✉️' },
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
    <div className="min-h-screen bg-paper text-ink flex flex-col selection:bg-accent selection:text-paper">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-ink/12 bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-2xl">🎣</span>
              <span className="font-black tracking-tight text-ink">
                PescaPlus <span className="text-accent">Admin</span>
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
                        ? 'bg-accent/10 text-accent border border-accent/40'
                        : 'text-ink/80 hover:text-ink hover:bg-white/5 border border-transparent'
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
              className="hidden sm:inline-flex text-xs font-semibold text-ink/60 hover:text-accent px-3 py-2 transition-colors"
            >
              Ver tienda ↗
            </Link>
            <button
              onClick={logout}
              className="text-xs font-bold text-ink/80 hover:text-ink bg-ink/5 hover:bg-ink/10 border border-ink/15 px-4 py-2 rounded-lg transition-all"
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
                    ? 'bg-accent/10 text-accent border border-accent/40'
                    : 'text-ink/80 hover:bg-white/5 border border-transparent'
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
