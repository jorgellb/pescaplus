'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon, { type IconName } from '@/components/icons/Icon'

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/admin', label: 'Productos', icon: 'package' },
  { href: '/admin/taxonomia', label: 'Taxonomía', icon: 'folder' },
  { href: '/admin/import', label: 'Importar IA', icon: 'cart' },
  { href: '/admin/guides', label: 'Guías', icon: 'notepad' },
  { href: '/admin/analytics', label: 'Analítica', icon: 'chartBar' },
  { href: '/admin/mensajes', label: 'Mensajes', icon: 'mail' },
  { href: '/admin/operadores', label: 'Operadores', icon: 'anchor' },
  { href: '/admin/settings', label: 'Configuración', icon: 'gear' },
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
      <header className="sticky top-0 z-40 border-b border-ink/[0.07] bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <Icon name="rod" className="w-6 h-6" strokeWidth={1.6} />
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
                    <Icon name={item.icon} className="w-4 h-4 inline-block mr-1.5 -mt-0.5" strokeWidth={1.8} />
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
              className="text-xs font-bold text-ink/80 hover:text-ink bg-ink/5 hover:bg-ink/10 border border-ink/10 px-4 py-2 rounded-lg transition-all"
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
                <Icon name={item.icon} className="w-4 h-4 inline-block mr-1.5 -mt-0.5" strokeWidth={1.8} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      {usingDefaultPassword && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs text-center py-2 px-4 inline-flex items-center justify-center gap-1.5 w-full">
          <Icon name="warning" className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />Estás usando la contraseña de administración por defecto. Define{' '}
          <code className="font-mono font-bold">ADMIN_PASSWORD</code> antes de desplegar en producción.
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
