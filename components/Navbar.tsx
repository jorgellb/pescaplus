'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FEATURED_FISHING_TYPES } from '@/lib/fishing'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    ...FEATURED_FISHING_TYPES.map((type) => ({
      name: type.name,
      href: `/categories/${type.id}`,
    })),
    { name: 'Consejos IA', href: '/advice' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 backdrop-blur-lg bg-slate-950/60 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center w-full">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl">🎣</span>
              <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-300 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
                PescaPlus
              </span>
            </Link>
            <div className="hidden md:flex ml-10 space-x-1.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="hidden md:flex items-center">
            <Link
              href="/advice"
              className="relative overflow-hidden group bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 px-5 py-2 rounded-lg font-bold text-sm tracking-wide shadow-md shadow-cyan-500/20 hover:shadow-cyan-400/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <span>🤖</span> Asistente IA
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-200"></div>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 focus:outline-none transition-colors"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menú</span>
              {mobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'} border-t border-white/5 bg-slate-950/95 backdrop-blur-xl`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-base font-medium transition-all ${
                isActive(item.href)
                  ? 'bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-400'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.name}
            </Link>
          ))}
          <div className="pt-4 pb-2 px-3">
            <Link
              href="/advice"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center flex justify-center items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 px-4 py-2.5 rounded-lg font-bold text-sm"
            >
              <span>🤖</span> Asistente IA
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}