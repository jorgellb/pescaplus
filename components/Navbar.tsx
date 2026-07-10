'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FISHING_TYPES } from '@/lib/fishing'
import CategoryIcon from '@/components/graphics/CategoryIcon'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const pathname = usePathname()
  const catRef = useRef<HTMLDivElement>(null)

  // Close the categories dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const isActive = (href: string) => pathname === href

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 backdrop-blur-lg bg-slate-950/60 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl">🎣</span>
              <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-300 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
                PescaPlus
              </span>
            </Link>

            <div className="hidden md:flex ml-10 items-center gap-1.5">
              {/* Categories dropdown */}
              <div className="relative" ref={catRef}>
                <button
                  onClick={() => setCatOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname.startsWith('/categories')
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                  aria-expanded={catOpen}
                >
                  Categorías
                  <svg className={`w-4 h-4 transition-transform ${catOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {catOpen && (
                  <div className="absolute left-0 mt-2 w-[30rem] p-2 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl shadow-black/50">
                    {FISHING_TYPES.map((type) => (
                      <Link
                        key={type.id}
                        href={`/categories/${type.id}`}
                        onClick={() => setCatOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          isActive(`/categories/${type.id}`)
                            ? 'bg-cyan-500/10 text-cyan-300'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="text-cyan-400 flex-shrink-0">
                          <CategoryIcon id={type.id} className="w-5 h-5" strokeWidth={1.5} />
                        </span>
                        <span className="text-sm font-medium truncate">{type.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/advice"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/advice')
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                Consejos IA
              </Link>
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
              aria-expanded={mobileMenuOpen}
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
      <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'} border-t border-white/5 bg-slate-950/95 backdrop-blur-xl max-h-[70vh] overflow-y-auto`} id="mobile-menu">
        <div className="px-2 pt-3 pb-3 sm:px-3">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Categorías</p>
          <div className="grid grid-cols-2 gap-1">
            {FISHING_TYPES.map((type) => (
              <Link
                key={type.id}
                href={`/categories/${type.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(`/categories/${type.id}`)
                    ? 'bg-cyan-500/10 text-cyan-300'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-cyan-400 flex-shrink-0">
                  <CategoryIcon id={type.id} className="w-5 h-5" strokeWidth={1.5} />
                </span>
                <span className="truncate">{type.name}</span>
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-1 px-1">
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
